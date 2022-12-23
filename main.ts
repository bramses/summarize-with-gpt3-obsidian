import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, request, MetadataCache } from 'obsidian';


// Remember to rename these classes and interfaces!

interface GPT3SummarizerSettings {
	apiKey: string;
	engine: string;
	tagToggle: boolean;
	keepOriginal: boolean;
}

const DEFAULT_SETTINGS: GPT3SummarizerSettings = {
	apiKey: 'default',
	engine: 'text-davinci-003',
	tagToggle: true,
	keepOriginal: true
}

export default class GPT3Summarizer extends Plugin {
	settings: GPT3SummarizerSettings;

	async callOpenAIAPI(prompt: string, engine = 'text-davinci-003') {
		const response = await request({
			url: `https://api.openai.com/v1/engines/${engine}/completions`,
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
		const engine = this.settings.engine;

		this.addCommand({
			id: 'summarize',
			name: 'Summarize',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const text = editor.getSelection();
				const summaryPrompt = `Summarize this text into one tweet.\n\nText:\n${text}\n\nSummary:\n`
				const summary = await this.callOpenAIAPI(summaryPrompt, engine);
				let tags = '';
				
				if (this.settings.tagToggle) {
					const tagsPrompt = `Summarize this text into a comma separated list of tags.\n\nText:\n${text}\n\nTags:\n`
					tags = await this.callOpenAIAPI(tagsPrompt, engine);
				}
				const titlePrompt = `Suggest a one line title for the following text.\n\nText:\n${text}\n\nTitle:\n`
				const title = await this.callOpenAIAPI(titlePrompt);

				editor.replaceSelection(`# ${title.trim()}${this.settings.tagToggle ? `\n\n## Tags:\n${tags}` : '' }\n\n## Summary:\n${summary}\n\n${this.settings.keepOriginal ? `## Original Text:\n\n${editor.getSelection()}` : '' }}`);
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

		// dropdown setting for choosing engine
		new Setting(containerEl)
			.setName('Engine')
			.setDesc('Choose the engine to use for summarization')
			.addDropdown(dropdown => dropdown
				.addOption('text-davinci-003', 'Davinci')
				.addOption('text-curie-001', 'Curie')
				.addOption('text-babbage-001', 'Babbage')
				.addOption('text-ada-001', 'Ada')
				.setValue(this.plugin.settings.engine)
				.onChange(async (value) => {
					console.log('Engine: ' + value);
					this.plugin.settings.engine = value;
					await this.plugin.saveSettings();
				}
			));

		// toggle for whether to add tags
		new Setting(containerEl)
			.setName('Add Tags')
			.setDesc('Add tags to the summary')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.tagToggle)
				.onChange(async (value) => {
					console.log('Tag Toggle: ' + value);
					this.plugin.settings.tagToggle = value;
					await this.plugin.saveSettings();
				}
			));

		// toggle for whether to keep original text
		new Setting(containerEl)
			.setName('Keep Original Text')
			.setDesc('Keep the original text in the summary')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.keepOriginal)
				.onChange(async (value) => {
					console.log('Keep Original: ' + value);
					this.plugin.settings.keepOriginal = value;
					await this.plugin.saveSettings();
				}
			));

	}
}
