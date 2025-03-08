import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import Archiver from './main';
import { getPathsFromFolderList } from './util';

// todo: create dedicated validation function & call it on saveSettings

export class ArchiverSettingsTab extends PluginSettingTab {
	plugin: Archiver;

	constructor(app: App, plugin: Archiver) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		// TODO: allow paths to be empty and handle those cases
		// todo: DRY

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
						getPathsFromFolderList(this.plugin, value);
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

		const CanvasMirrorDescription = document.createDocumentFragment();
		const CanvasMirror = document.createElement('a');
		CanvasMirror.href = 'https://github.com/cxrvus/canvas-mirror';
		CanvasMirror.textContent = 'Canvas Mirror';
		CanvasMirrorDescription.append('exclude ', CanvasMirror, ' files from being archived');

		new Setting(containerEl)
			.setName('Exclude Canvas Mirrors')
			.setDesc(CanvasMirrorDescription)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.excludeMirrors)
				.onChange(async (value) => {
					this.plugin.settings.excludeMirrors = value;
					await this.plugin.saveSettings();
				})
			)
		;
	}
}
