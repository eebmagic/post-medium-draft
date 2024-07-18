import {
	App,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	request,
} from 'obsidian';

// Remember to rename these classes and interfaces!

interface PostMediumDraftPluginSettings {
	userMediumToken: string;
	tokenIsValid: boolean;
	userName?: string;
	userProperName?: string;
}

const DEFAULT_SETTINGS: PostMediumDraftPluginSettings = {
	userMediumToken: '',
	tokenIsValid: false,
}

export default class PostMediumDraftPlugin extends Plugin {
	settings: PostMediumDraftPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconPost = this.addRibbonIcon('dice', 'Post Medium Draft', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This would post to Medium!');
		});
		ribbonIconPost.addClass('post-medium-ribbon-class');

		// Add commands
		this.addCommand({
			id: 'post-medium-draft',
			name: 'Post to Medium as a draft',
			callback: () => {
				console.log('now is when a post call would be made to medium');
				new Notice('This would make a call to post to Medium as a draft!');
			}
		});

		this.addCommand({
			id: 'check-user-metadata',
			name: 'Check user metadata',
			callback: () => {
				if (this.settings.tokenIsValid) {
					const displayText = [
						`Username: ${this.settings.userName}`,
						`Proper Name: ${this.settings.userProperName}`,
					];
					new SampleModal(this.app, displayText).open();
				} else {
					new Notice('Please check your Medium token');
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
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
			console.log('Got fetch response');
			console.log(response);

			const data = JSON.parse(response);
			console.log('Converted to JSON data:');
			console.log(data);

			const username = data.data.username;
			const properName = data.data.name;
			this.settings.userName = username;
			this.settings.userProperName = properName;
			this.settings.tokenIsValid = true;
			// await this.saveSettings();

			return {
				state: 'success',
				data,
			};
		} catch (error) {
			console.error('Error while checking Medium token:', error);
			this.settings.tokenIsValid = false;
			return {
				state: 'error',
				error,
			};
		}
	}
}

class SampleModal extends Modal {
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
		// contentEl.createEl(this.displayText);
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: PostMediumDraftPlugin;

	constructor(app: App, plugin: PostMediumDraftPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Medium Integration Token')
			.setDesc('Create one in your Medium account settings under: Security and apps > Integration tokens')
			.addText(text => text
				.setPlaceholder('Enter your token')
				.setValue(this.plugin.settings.userMediumToken)
				.onChange(async (value) => {
					this.plugin.settings.userMediumToken = value;
					await this.plugin.saveSettings();

					// Check if the token is valid
					console.log('UPDATED MEDIUM TOKEN. Now checking if it is valid');
					if (value) {
						const result = await this.plugin.checkValidToken(value)
						console.log('Got result');
						console.log(result);
						if (result.state === 'success') {
							const username = result.data.data.username;
							const message = `Token is valid! User Name: ${username}`;
							new Notice(message);
							console.log(message);
						} else {
							const message = `Token is invalid! Error: ${result.error}`;
							new Notice(message);
							console.error(message);
						}
					}
				}));
	}
}
