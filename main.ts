import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, request, MetadataCache } from 'obsidian';


// Remember to rename these classes and interfaces!

interface GPT3SummarizerSettings {
	apiKey: string;
}

const DEFAULT_SETTINGS: GPT3SummarizerSettings = {
	apiKey: 'default'
}

export default class GPT3Summarizer extends Plugin {
	settings: GPT3SummarizerSettings;

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

		// todo embedding stuff
		// const file = this.app.workspace.getActiveFile()
		// console.log(file);
		// const content = await this.app.vault.read(file);
		// const sections = this.app.metadataCache.getCache('Daily/2022-06-03.md').sections;
		// const lists:string[] = []
		// sections.filter(section => section.type === 'list').forEach(section => {
		// 	lists.push(content.slice(section.position.start.offset, section.position.end.offset))
		// })
		// console.log(lists);
		
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'summarize',
			name: 'Summarize',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const text = editor.getSelection();
				const summaryPrompt = `Summarize this text into one tweet.\n\nText:\n${text}\n\nSummary:\n`
				const summary = await this.callOpenAIAPI(editor.getSelection(), summaryPrompt);
				const tagsPrompt = `Summarize this text into a comma separated list of tags.\n\nText:\n${text}\n\nTags:\n`
				const tags = await this.callOpenAIAPI(editor.getSelection(), tagsPrompt);
				const titlePrompt = `Suggest a one line title for the following text.\n\nText:\n${text}\n\nTitle:\n`
				const title = await this.callOpenAIAPI(editor.getSelection(), titlePrompt);
				editor.replaceSelection(`# ${title.trim()}\n\n## Tags:\n${tags}\n\n## Summary:\n${summary}\n\n## Original Text:\n\n${editor.getSelection()}`);
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
