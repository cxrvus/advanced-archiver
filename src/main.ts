import { App, Command, Notice, Plugin, PluginSettingTab, Setting, SuggestModal } from 'obsidian';
import * as archiver from './archiver'


interface ArchiverSettings {
	targetFolder: string;
	includedFolders: string;
	rootFile: string;
	excludeMirrors: boolean;
}

const DEFAULT_SETTINGS: ArchiverSettings = {
	targetFolder: 'Archive',
	includedFolders: '',
	rootFile: '',
	excludeMirrors: false,
}

class CommandsModal extends SuggestModal<string> {
	app: App;
	commands: Command[];

	constructor(app: App, commands: Command[]) {
		super(app);
		this.app = app;
		this.commands = commands;
	}

	// hide search bar
	onOpen() {
		super.onOpen();
		this.inputEl.style.display = "none";
	}

	getSuggestions(): string[] {
		return this.commands.map(({ name }) => name);
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.createEl("div", { text: value });
	}

	onChooseSuggestion(item: string, _: MouseEvent | KeyboardEvent): void {
		this.commands.find(({ name }) => name == item)?.callback?.();
	}
}

export default class Archiver extends Plugin {
	settings: ArchiverSettings;

	commands: Command[] = [];

	addCommand(command: Command): Command {
		this.commands.push(command);
		return super.addCommand(command);
	}

	async onload() {
		await this.loadSettings();

		// todo: rename to 'create back-up'
		this.addCommand({
			id: 'archive-current-copied',
			name: 'Archive Copy of Current File',
			callback: () => archiver.archiveCurrent(this, true).catch(e => new Notice(e))
		});

		this.addCommand({
			id: 'archive-current',
			name: 'Archive Current File',
			callback: () => archiver.archiveCurrent(this, false).catch(e => new Notice(e))
		});

		this.addCommand({
			id: 'archive-index',
			name: 'Create Archive Index',
			callback: () => archiver.createArchiveIndex(this).catch(e => new Notice(e))
		});

		// todo: add command to show old versions

		const ribbonButton = this.addRibbonIcon("archive", "Advanced Archiver", (_: MouseEvent) => {
			new CommandsModal(this.app, this.commands).open();
		});

		ribbonButton.setAttribute("aria-label", "Advanced Archiver");

		this.addSettingTab(new ArchiverSettingsTab(this.app, this));

		// ## Settings:
		// fixme: move all validation to saveSettings()
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
