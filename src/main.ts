import { App, FileView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';


interface ArchiverSettings {
	folder: string;
}

const DEFAULT_SETTINGS: ArchiverSettings = {
	folder: 'default'
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
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(FileView);
				if (markdownView) {
					if (!checking) {
						new Notice('This is a notice!');
					}
					return true;
				}
			}
		});

		this.addSettingTab(new ArchiverSettingsTab(this.app, this));
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
					this.plugin.settings.folder = value;
					await this.plugin.saveSettings();
				}));
	}
}
