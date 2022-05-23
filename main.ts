import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, request } from 'obsidian';
import { EditorExtensions } from "editor-enhancements";


// Remember to rename these classes and interfaces!

interface GPT3SummarizerSettings {
	apiKey: string;
}

const DEFAULT_SETTINGS: GPT3SummarizerSettings = {
	apiKey: 'default'
}

export default class GPT3Summarizer extends Plugin {
	settings: GPT3SummarizerSettings;


	// // Custom hashid by @shabegom
	// private createBlockHash(): string {
	// 	let result = "";
	// 	const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
	// 	const charactersLength = characters.length;
	// 	for (let i = 0; i < 4; i++) {
	// 		result += characters.charAt(
	// 			Math.floor(Math.random() * charactersLength)
	// 		);
	// 	}
	// 	return result;
	// }

	// async conveyorBelt(url = "") {
	// 	// todo
	// }

	// async convertUrlToTitledLink(editor: Editor, url: string): Promise<void> {
	// 	// Generate a unique id for find/replace operations for the title.
	// 	const pasteId = `Fetching Answer#${this.createBlockHash()}`;

	// 	// Instantly paste so you don't wonder if paste is broken
	// 	editor.replaceSelection(`${pasteId}`);

	// 	// Fetch title from site, replace Fetching Title with actual title
	// 	const stackOverflowMarkdown = await this.conveyorBelt(url);

	// 	const text = editor.getValue();

	// 	const start = text.indexOf(pasteId);
	// 	if (start < 0) {
	// 		console.log(
	// 			`Unable to find text "${pasteId}" in current editor, bailing out; link ${url}`
	// 		);
	// 	} else {
	// 		const end = start + pasteId.length;
	// 		const startPos = EditorExtensions.getEditorPositionFromIndex(
	// 			text,
	// 			start
	// 		);
	// 		const endPos = EditorExtensions.getEditorPositionFromIndex(
	// 			text,
	// 			end
	// 		);

	// 		editor.replaceRange(stackOverflowMarkdown, startPos, endPos);
	// 	}
	// }



	async callOpenAIAPI(text: string, prompt: string) {
		const response = await request({
			url: 'https://api.openai.com/v1/engines/text-davinci-002/completions',
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.settings.apiKey}`,
				'Content-Type': 'application/json'
			},
			contentType: 'application/json',
			body: JSON.stringify({
				"prompt": prompt,
				"max_tokens": 250,
				"temperature": 0.3,
				"best_of": 3
			})
		});

		const responseJSON = JSON.parse(response);
		return responseJSON.choices[0].text;
	}

	async onload() {
		await this.loadSettings();

		
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'summarize',
			name: 'Summarize',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				// editor.replaceSelection('GPT3Summarizer Editor Command');
				const text = editor.getSelection();
				const summaryPrompt = `Summarize this text.\n\nText:\n${text}\n\nSummary:\n`
				const summary = await this.callOpenAIAPI(editor.getSelection(), summaryPrompt);
				const titlePrompt = `Suggest a one line title for the following text.\n\nText:\n${text}\n\nTitle:\n`
				const title = await this.callOpenAIAPI(editor.getSelection(), titlePrompt);
				editor.replaceSelection(`# ${title.trim()}\n\n## Summary:\n${summary}\n\n## Original Text:\n\n${editor.getSelection()}`);
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new GPT3SummarizerModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new GPT3SummarizerTab(this.app, this));
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

class GPT3SummarizerModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class GPT3SummarizerTab extends PluginSettingTab {
	plugin: GPT3Summarizer;

	constructor(app: App, plugin: GPT3Summarizer) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('API Key for OpenAI')
			.addText(text => text
				.setPlaceholder('some-api-key')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));
	}
}
