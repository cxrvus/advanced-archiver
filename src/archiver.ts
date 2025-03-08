import { FileView, Notice, TFile } from 'obsidian';
import Archiver from './main';
import { getDatePrefix, getFilePath, getOutlinks, isOrphan, postFilter, preFilter } from './util';

// todo: change these tags to reflect different types of archive indexes
const INDEX_TAG = '#archive_index';

export const archive = async (self: Archiver, files: TFile[], copied: boolean) => {
	const { vault } = self.app;
	const archiveFolderPath = await getArchivePath(self);
	const archivedFiles = []

	for(const file of files) {
		try {
			const isMutable = file.extension == 'md' || file.extension == 'canvas';

			// todo: toggle date prefix in settings / depending on command
			const date = isMutable ? getDatePrefix() : '';

			let archiveFilePath = getFilePath(archiveFolderPath, date, file.name);
			let alreadyArchivedFile = vault.getFileByPath(archiveFilePath);

			// TODO: add setting to enable zero-appending, also appending to non-duplicate files
			// todo: manually migrate / rename old files
			if (isMutable && alreadyArchivedFile) {

				const archiveFilePathBase = getFilePath(archiveFolderPath, date, file.basename);

				// max back up count of 10 per day
				for (let i = 1; i <= 9; i++) {
					archiveFilePath = `${archiveFilePathBase} (${i}).${file.extension}`;
					alreadyArchivedFile = vault.getFileByPath(archiveFilePath)

					if (!alreadyArchivedFile) break;
				}

				// if the file with index 9 exists delete it and replace it with the new one
				// todo: add setting to disable this
				if (alreadyArchivedFile) await vault.delete(alreadyArchivedFile);
			}

			const toBeArchivedFile = await vault.copy(file, archiveFilePath);
			if (!copied) await vault.delete(file);

			archivedFiles.push(toBeArchivedFile);
		} catch (e) {
			throw new Error(`Failed to archive file: ${e.message}`);
		} 
	}

	new Notice(`archived ${archivedFiles.length} file(s)`);

	return archivedFiles;
}

const getArchivePath = async (self: Archiver) => {
	const { vault } = self.app;
	const { targetFolder: folder } = self.settings;

	if (!vault.getFolderByPath(folder)) await vault.createFolder(folder);
	return folder;
}

export const archiveCurrent = async (self: Archiver, copied: boolean) => {
	const currentFile = self.app.workspace.getActiveViewOfType(FileView)?.file;

	if (currentFile) {
		const content = await self.app.vault.cachedRead(currentFile);

		if (content.includes(INDEX_TAG)) await archiveFromIndex(self, copied, currentFile);
		else await archive(self, [currentFile], copied)
	}
	else {
		new Notice('no file to archive selected');
	}
}

const archiveFromIndex = async (self: Archiver, copied: boolean, indexFile: TFile) => {
	const files = getOutlinks(self, indexFile)
		.map(path => self.app.vault.getFileByPath(path))
		.filter((file): file is TFile => file != null)
	;

	await archive(self, files, copied);
}

// todo: standardize archive indexes, e.g. for orphans AND old versions
// idea: could use custom template
export const createArchiveIndex = async (self: Archiver) => {
	const { vault, workspace } = self.app;

	// idea: if enabled in settings, generate Canvas Mirrors

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
					.filter((file): file is TFile => file != null);
				searchFiles.push(...outlinks);
			}
		}

		untrackedFiles = includedFiles.filter(x => !trackedFiles.some(y => y.path == x.path));
	}
	else {
		new Notice('please set Root File in settings to get advanced tracking');
		untrackedFiles = includedFiles.filter(file => isOrphan(self, file));
	}

	untrackedFiles = untrackedFiles.filter(file => postFilter(self, file.path))

	const intro = `${INDEX_TAG}\n\n> [!info]\n> Found ${untrackedFiles.length} file(s)\n> Perform an Archive action on **this** note to archive all mentioned files\n`;
	const headers = "| File |\n| --- |";
	const data = untrackedFiles
		.map(file => `| [[${file.path}\\|${file.name}]] |`)
		.join('\n')
	;

	const content = [intro, headers, data, ''].join('\n')

	const folderPath = await getArchivePath(self);
	
	// TODO: make the Archive Index path customizable and static
	// todo: add Archive Index path setting
	const filePath = `${folderPath}/${getDatePrefix()}Archive Index.md`; 

	const oldFile = vault.getFileByPath(filePath);
	if (oldFile) await vault.delete(oldFile);

	const newFile = await vault.create(filePath, content);
	workspace.getLeaf(true).openFile(newFile);
}
