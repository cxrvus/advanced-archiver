import { FileView, Notice, TFile } from 'obsidian';
import AdvancedArchiver from './main';


export const archive = async (self: AdvancedArchiver, files: TFile[], copied: boolean) => {
	const { vault } = self.app;
	const archiveFolderPath = await getArchivePath(self);
	const archivedFiles = []

	for(const file of files) {
		try {
			const archiveFilePath = `${archiveFolderPath}/${file.name}`;
			const archivedFile = await vault.copy(file, archiveFilePath);
			if (!copied) await vault.delete(file);

			archivedFiles.push(archivedFile);
		} catch (e) {
			throw new Error(`Failed to archive file: ${e.message}`);
		} finally {
			new Notice(`archived ${archivedFiles.length} file(s)`);
		}
	}

	return archivedFiles;
}

const getArchivePath = async (self: AdvancedArchiver) => {
	const { vault } = self.app;
	const { targetFolder: folder } = self.settings;

	if (!vault.getFolderByPath(folder)) await vault.createFolder(folder);

	const date = new Date().toISOString().split('T')[0];
	const datedPath = `${folder}/${date}`;

	if (!vault.getFolderByPath(datedPath)) await vault.createFolder(datedPath);

	return datedPath;
}

export const archiveCurrent = (self: AdvancedArchiver, copied: boolean, checking: boolean) => {
	const currentFile = self.app.workspace.getActiveViewOfType(FileView)?.file;

	if (currentFile) {
		if (!checking) {
			if (currentFile) {
				archive(self, [currentFile], copied)
				.catch((error) => {
					new Notice(error.message);
				});
			}
		}
	}
	return !!currentFile;
}

export const createArchiveIndexSync = (self: AdvancedArchiver) => {
	createArchiveIndex(self).catch(e => new Notice(`failed to create Archive Index: ${e}`));
}

const createArchiveIndex = async (self: AdvancedArchiver) => {
	const { vault, workspace } = self.app;

	const activeFiles = vault.getFiles().filter(({path}) => isActive(self, path));

	const archiveFiles = activeFiles.map(file =>
		{
			let reason;
			if (isOrphan(self, file)) reason = 'Orphan';
			else reason = null;
			return { file, reason };
		})
		.filter(({reason}) => reason)
	;

	// todo: display as callout
	const intro = `*Found ${archiveFiles.length} file(s)*\n*Press the Auto-Archive button again to archive all mentioned files in current note*\n`;
	const headers = "| File | Reason |\n| --- | --- |";
	const data = archiveFiles
		.map(({file, reason}) => `| [[${file.path}\\|${file.name}]] | ${reason} |`)
		.join('\n')
	;

	const content = [intro, headers, data, ''].join('\n')

	const folderPath = await getArchivePath(self);
	const filePath = `${folderPath}/Archive Index.md`; 

	const oldFile = vault.getFileByPath(filePath);
	if (oldFile) await vault.delete(oldFile);

	const newFile = await vault.create(filePath, content);
	workspace.getLeaf(true).openFile(newFile);
}

const isOrphan = (self: AdvancedArchiver, file: TFile): boolean => {
	const inlinks = getInlinks(self, file).filter(link => isActive(self, link));
	const outlinks = getOutlinks(self, file).filter(link => isActive(self, link));
	return !inlinks.length && !outlinks.length;
}

const getInlinks = (self: AdvancedArchiver, file: TFile): string[] => {
	const { resolvedLinks } = self.app.metadataCache;
	return Object.entries(resolvedLinks)
		.filter(([, targetFiles]) => targetFiles[file.path] > 0)
		.map(([sourcePath]) => sourcePath);
}

const getOutlinks = (self: AdvancedArchiver, file: TFile): string[] => {
	const { resolvedLinks } = self.app.metadataCache;
	return resolvedLinks[file.path] ? Object.keys(resolvedLinks[file.path]) : [];
}

const isActive = (self: AdvancedArchiver, path: string) => {
	const includedPaths = getPathsFromFolderList(self, self.settings.includedFolders);
	return !!includedPaths.find(includedPath => path.startsWith(includedPath));
}

export const getPathsFromFolderList = (self: AdvancedArchiver, folderList: string) => {
	const paths = folderList.split(',').map(x => x.trim());
	paths.forEach(path => { if (!self.app.vault.getFolderByPath(path)) throw new Error(`invalid folder: ${path}`)});
	return paths;
}
