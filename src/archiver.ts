import { FileView, Notice, TFile } from 'obsidian';
import AdvancedArchiver from './main';

export const archiveCurrent = (self: AdvancedArchiver, copied: boolean, checking: boolean) => {
	const currentFile = self.app.workspace.getActiveViewOfType(FileView)?.file;

	if (currentFile) {
		if (!checking) {
			if (currentFile) {
				archive(self, [currentFile], false)
				.catch((error) => {
					new Notice(error.message);
				});
			}
		}
	}
	return !!currentFile;
}

export const archive = async (self: AdvancedArchiver, files: TFile[], copied: boolean) => {
	const { vault } = self.app;
	const { folder } = self.settings;

	if (!vault.getFolderByPath(folder)) await vault.createFolder(folder);

	const date = new Date().toISOString().split('T')[0];
	const datedPath = `${folder}/${date}`;

	if (!vault.getFolderByPath(datedPath)) await vault.createFolder(datedPath);

	let i = 0;

	for(const file of files) {
		try {
			const path = `${datedPath}/${file.name}`;
			await vault.copy(file, path);
			if (!copied) await vault.delete(file);
			i++;
		} catch (e) {
			throw new Error(`Failed to archive file: ${e.message}`);
		} finally {
			new Notice(`archived ${i} file(s)`);
		}
	}
}