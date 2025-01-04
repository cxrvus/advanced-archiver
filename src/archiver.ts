import { FileView, Notice, TFile } from 'obsidian';
import Archiver from './main';


export const archive = async (self: Archiver, files: TFile[], copied: boolean) => {
	const { vault } = self.app;
	const archiveFolderPath = await getArchivePath(self);
	const archivedFiles = []

	for(const file of files) {
		try {
			const archiveFilePath = `${archiveFolderPath} - ${file.name}`;
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

const getArchivePath = async (self: Archiver) => {
	const { vault } = self.app;
	const { targetFolder: folder } = self.settings;

	if (!vault.getFolderByPath(folder)) await vault.createFolder(folder);

	const date = new Date().toISOString().split('T')[0];

	return `${folder}/${date}`;
}

export const archiveCurrent = (self: Archiver, copied: boolean, checking: boolean) => {
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

export const createArchiveIndexSync = (self: Archiver) => {
	createArchiveIndex(self).catch(e => new Notice(`failed to create Archive Index: ${e}`));
}

const createArchiveIndex = async (self: Archiver) => {
	const { vault, workspace } = self.app;

	const includedFiles = vault.getFiles()
		.filter(({path}) => preFilter(self, path))
	;

	const rootFile = self.app.vault.getFileByPath(self.settings.rootFile);
	let untrackedFiles: TFile[];

	if (rootFile) {
		const trackedFiles: TFile[] = [];
		const searchFiles = [rootFile];

		while (searchFiles.length > 0) {
			const searchFile = searchFiles.pop();
			if (searchFile && !trackedFiles.includes(searchFile)) {
				trackedFiles.push(searchFile);
				const outlinks = getOutlinks(self, searchFile)
					.map(path => vault.getFileByPath(path))
					.filter(file => file != null);
				searchFiles.push(...outlinks);
			}
		}

		untrackedFiles = includedFiles.filter(x => !trackedFiles.find(y => y.path == x.path));
	}
	else {
		new Notice('please set Root File in settings to get advanced tracking');
		untrackedFiles = includedFiles.filter(file => isOrphan(self, file));
	}

	const intro = `> [!info]\n> Found ${untrackedFiles.length} file(s)\n> Perform Auto-Archive again to archive all mentioned files in current note\n`;
	const headers = "| File |\n| --- |";
	const data = untrackedFiles
		.map(file => `| [[${file.path}\\|${file.name}]] |`)
		.join('\n')
	;

	const content = [intro, headers, data, ''].join('\n')

	const folderPath = await getArchivePath(self);
	const filePath = `${folderPath} - Archive Index.md`; 

	const oldFile = vault.getFileByPath(filePath);
	if (oldFile) await vault.delete(oldFile);

	const newFile = await vault.create(filePath, content);
	workspace.getLeaf(true).openFile(newFile);
}

const isOrphan = (self: Archiver, file: TFile): boolean => {
	const inlinks = getInlinks(self, file);
	const outlinks = getOutlinks(self, file);
	return !inlinks.length && !outlinks.length;
}

const getInlinks = (self: Archiver, file: TFile): string[] => {
	const { resolvedLinks } = self.app.metadataCache;
	return Object.entries(resolvedLinks)
		.filter(([, targetFiles]) => targetFiles[file.path] > 0)
		.map(([sourcePath]) => sourcePath)
		.filter(path => preFilter(self, path));
}

const getOutlinks = (self: Archiver, file: TFile): string[] => {
	const { resolvedLinks } = self.app.metadataCache;
	const outLinks = resolvedLinks[file.path] ? Object.keys(resolvedLinks[file.path]) : [];
	return outLinks.filter(path => preFilter(self, path));
}

const preFilter = (self: Archiver, path: string) => {
	const includedPaths = getPathsFromFolderList(self, self.settings.includedFolders);
	return !!includedPaths.find(includedPath => path.startsWith(includedPath));
}

export const getPathsFromFolderList = (self: Archiver, folderList: string) => {
	const paths = folderList.split(',').map(x => x.trim());
	paths.forEach(path => { if (!self.app.vault.getFolderByPath(path)) throw new Error(`invalid folder: ${path}`)});
	return paths;
}
