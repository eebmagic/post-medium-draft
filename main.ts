import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	request,
} from 'obsidian';

interface PostMediumDraftPluginSettings {
	userMediumToken: string;
	userName?: string;
	userProperName?: string;
	userId?: string;
}

const DEFAULT_SETTINGS: PostMediumDraftPluginSettings = {
	userMediumToken: '',
}

export default class PostMediumDraftPlugin extends Plugin {
	settings: PostMediumDraftPluginSettings;

	async publishToMedium(view: MarkdownView) {
		if (!view || !view.file) {
			new Notice('Failed to post: No file in active view!');
			return;
		}

		if (!this.settings.userMediumToken || !this.settings.userId) {
			new Notice('Please check your Medium token');
			return;
		}

		const body = {
			"title": view.file.basename,
			"content": view.getViewData(),
			"contentFormat": "markdown",
			"publishStatus": "draft",
		}

		try {
			const reqBody = {
				url: `https://api.medium.com/v1/users/${this.settings.userId}/posts`,
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.settings.userMediumToken}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'Accept-Charset': 'utf-8',
				},
				body: JSON.stringify(body),
			};
			const response = await request(reqBody);
			const data = JSON.parse(response);

			const message = `Posted Medium draft: ${data.data.url}`;
			new Notice(message);
		} catch (error) {
			new Notice(`Failed to post to Medium: ${error}`);
		}
	}

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconPost = this.addRibbonIcon('monitor-up', 'Post Medium draft', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view) {
				new Notice('Failed to post: No file in active view!');
				return;
			}

			if (evt.which && evt.which === 1) {
				this.publishToMedium(view);
			}
		});
		ribbonIconPost.addClass('post-medium-ribbon-class');

		// Add commands
		this.addCommand({
			id: 'post-medium-draft',
			name: 'Send Note',
			editorCallback: (_, view: MarkdownView) => {
				this.publishToMedium(view);
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.checkValidToken(this.settings.userMediumToken);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async checkValidToken(token: string) {
		try {
			const response = await request({
				url: 'https://api.medium.com/v1/me',
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				}
			});

			const data = JSON.parse(response);

			const username = data.data.username;
			const properName = data.data.name;
			this.settings.userName = username;
			this.settings.userProperName = properName;
			this.settings.userId = data.data.id;

			return {
				state: 'success',
				data,
			};
		} catch (error) {
			console.error('Error while checking Medium token:', error);
			return {
				state: 'error',
				error,
			};
		}
	}
}

class MetaModal extends Modal {
	displayText: string[];

	constructor(app: App, texts: string | string[] = 'Hello') {
		super(app);
		this.displayText = Array.isArray(texts) ? texts : [texts];
	}

	onOpen() {
		const {contentEl} = this;
		this.displayText.forEach(element => {
			contentEl.createEl('p', {text: element});
		});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SettingTab extends PluginSettingTab {
	plugin: PostMediumDraftPlugin;

	constructor(app: App, plugin: PostMediumDraftPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Medium service integration token')
			.setDesc('Create one in your Medium account settings under: Security and apps > Integration tokens')
			.addText(text => text
				.setPlaceholder('Enter your token')
				.setValue(this.plugin.settings.userMediumToken)
				.onChange(async (value) => {
					this.plugin.settings.userMediumToken = value;
					await this.plugin.saveSettings();

					// Check if the token is valid
					if (value) {
						const result = await this.plugin.checkValidToken(value)
						if (result.state === 'success') {
							const username = result.data.data.username;
							const message = `Token is valid! Username: ${username}`;
							new Notice(message);
						} else {
							const message = `Token is invalid! Error: ${result.error}`;
							new Notice(message);
						}
					}
				}));
	}
}
