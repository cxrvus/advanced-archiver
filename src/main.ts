import { App, Command, Notice, Plugin, SuggestModal } from 'obsidian';
import * as archiver from './archiver'
import { ArchiverSettingsTab } from './settings';


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
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

