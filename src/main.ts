import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as archiver from './archiver'


interface ArchiverSettings {
	folder: string;
}

const DEFAULT_SETTINGS: ArchiverSettings = {
	folder: 'Archive'
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
			checkCallback: (checking) => archiver.archiveCurrent(this, false, checking)
		});

		this.addCommand({
			id: 'archive-current-copied',
			name: 'Archive Copy of Current File',
			checkCallback: (checking) => archiver.archiveCurrent(this, true, checking)
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
