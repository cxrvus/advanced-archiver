import { App, FileView, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';


interface ArchiverSettings {
	folder: string;
}

const DEFAULT_SETTINGS: ArchiverSettings = {
	folder: ''
}

export default class AdvancedArchiver extends Plugin {
	settings: ArchiverSettings;

	async onload() {
		await this.loadSettings();

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'archive-orphans',
			name: 'Archive Orphans',
			callback: () => {
				new Notice('This is a notice!');
			}
		});

		this.addCommand({
			id: 'archive-current',
			name: 'Archive Current File',
			checkCallback: (checking) => {
				const currentFile = this.app.workspace.getActiveViewOfType(FileView)?.file;

				if (currentFile) {
					if (!checking) {
						if (currentFile) {
							this.archiveCurrent(currentFile, false)
							.catch((error) => {
								new Notice(error.message);
							});
						}
					}
				}
				
				return !!currentFile;
			}
		});

		this.addCommand({
			id: 'archive-current-copied',
			name: 'Archive Copy of Current File',
			checkCallback: (checking) => {
				const currentFile = this.app.workspace.getActiveViewOfType(FileView)?.file;

				if (currentFile) {
					if (!checking) {
						if (currentFile) {
							this.archiveCurrent(currentFile, true)
							.catch((error) => {
								new Notice(error.message);
							});
						}
					}
				}
				
				return !!currentFile;
			}
		});

		this.addSettingTab(new ArchiverSettingsTab(this.app, this));

		// ## Commands
		// todo: MD table formatting
		// todo: create archival preview
		// todo: archive from preview

		// ## Conditions:
		// todo: archive orphan files
		// todo: archive untracked files

		// ## Settings:
		// todo: root files (Search field)
		// todo: never archive (Search field)
		// idea: archival conditions (see above)
		// idea: always archive (Search field)
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async archiveCurrent(file: TFile, copied: boolean) {
		await this.archive([file], copied);
	}

	async archive(files: TFile[], copied: boolean) {
		const { vault } = this.app;
		const { folder } = this.settings;

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
}


class ArchiverSettingsTab extends PluginSettingTab {
	plugin: AdvancedArchiver;

	constructor(app: App, plugin: AdvancedArchiver) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Archive Folder')
			.setDesc('target folder for you archived notes')
			.addText(text => text
				.setPlaceholder('Folder')
				.setValue(this.plugin.settings.folder)
				.onChange(async (value) => {
					if (!value) new Notice("please specify a folder!");
					else if (!this.app.vault.getFolderByPath(value)) new Notice("please specify a valid folder!");
					else {
						this.plugin.settings.folder = value;
						await this.plugin.saveSettings();
					}
				}));
	}
}
