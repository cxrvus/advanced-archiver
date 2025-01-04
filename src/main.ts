import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as archiver from './archiver'


interface ArchiverSettings {
	targetFolder: string;
	includedFolders: string;
	rootFile: string;
}

const DEFAULT_SETTINGS: ArchiverSettings = {
	targetFolder: 'Archive',
	includedFolders: '',
	rootFile: '',
}

export default class Archiver extends Plugin {
	settings: ArchiverSettings;

	async onload() {
		await this.loadSettings();

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'archive-index',
			name: 'Create Archive Index',
			callback: () => {
				archiver.createArchiveIndexSync(this);
			}
		});

		this.addCommand({
			id: 'archive-current',
			name: 'Archive Current File',
			checkCallback: (checking) => archiver.archiveCurrent(this, false, checking)
		});

		this.addCommand({
			id: 'archive-current-copied',
			name: 'Archive Copy of Current File',
			checkCallback: (checking) => archiver.archiveCurrent(this, true, checking)
		});

		this.addSettingTab(new ArchiverSettingsTab(this.app, this));

		// ## UI
		// idea: add ribbon button to create back-up a.k.a. archive-copy

		// ## Commands
		// todo: archive from index

		// ## Settings:
		// fixme: move all validation to saveSettings()
		// todo: option to exclude Canvas Mirrors
		// idea: archival conditions (see above)
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class ArchiverSettingsTab extends PluginSettingTab {
	plugin: Archiver;

	constructor(app: App, plugin: Archiver) {
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
				.setValue(this.plugin.settings.targetFolder)
				.onChange(async (value) => {
					if (!value) new Notice("please specify a folder!");
					else if (!this.app.vault.getFolderByPath(value)) new Notice("please specify a valid folder!");
					else {
						this.plugin.settings.targetFolder = value;
						await this.plugin.saveSettings();
					}
				})
			)
		;

		new Setting(containerEl)
			.setName('Search Folders')
			.setDesc('folders that will be searched by Archiver, separated by commas')
			.addText(text => text
				.setPlaceholder('Folders')
				.setValue(this.plugin.settings.includedFolders)
				.onChange(async (value) => {
					try {
						archiver.getPathsFromFolderList(this.plugin, value);
					}
					catch (e) {
						return;
					}

					new Notice('successfully changed included folders');

					this.plugin.settings.includedFolders = value;
					await this.plugin.saveSettings();
				})
			)
		;

		new Setting(containerEl)
			.setName('Root File')
			.setDesc('file that will be used to recursively detect untracked files')
			.addText(text => text
				.setPlaceholder('File')
				.setValue(this.plugin.settings.rootFile)
				.onChange(async (value) => {
					if (!this.app.vault.getFileByPath(value)) return

					new Notice('successfully changed root file');

					this.plugin.settings.rootFile = value;
					await this.plugin.saveSettings();
				})
			)
		;
	}
}
