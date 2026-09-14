import { ApplicationCommandOptionType, ChannelType, ChatInputCommandInteraction, Collection, SlashCommandBuilder } from "discord.js";
import type { Command } from '../types';

interface Choice {
	name: string,
	value: string
}

interface Options {
	type: ApplicationCommandOptionType,
	name: string,
	description: string,
	choices?: Choice[],
	channelTypes?: ChannelType[],
	minLength?: number,
	maxLength?: number,
	required?: boolean,
	options?: Options[], // Nested options for subcommands
}

interface CreateCommandProps {
	name: string,
	description: string,
	options: Options[],
	defaultPermission?: bigint,
}

interface OptionBuilder {
	setName(name: string): OptionBuilder;
	setDescription(description: string): OptionBuilder;
	setRequired?(required: boolean): OptionBuilder;
	addChoices?(...choices: Choice[]): OptionBuilder;
	addChannelTypes?(...channelTypes: ChannelType[]): OptionBuilder;
	setMinLength?(length: number): OptionBuilder;
	setMaxLength?(length: number): OptionBuilder;
}

type DynamicBuilder = Record<string, (configure: (option: OptionBuilder) => OptionBuilder) => unknown>;

const commandOption = {
	1: "addSubcommand",
	2: "addSubcommandGroup",
	3: "addStringOption",
	4: "addIntegerOption",
	5: "addBooleanOption",
	6: "addUserOption",
	7: "addChannelOption",
	8: "addRoleOption",
	9: "addMentionableOption",
	10: "addNumberOption",
	11: "addAttachmentOption",
}

function buildOptions(builder: DynamicBuilder, options: Options[]) {
	for (const optionData of options) {
		const { type, name, description, minLength, maxLength, choices, channelTypes, required, options: nestedOptions } = optionData;
		const method = commandOption[type];

		if (!method) continue;

		builder[method]((option) => {
			option.setName(name).setDescription(description);

			if (required !== undefined && typeof option.setRequired === 'function') {
				option.setRequired(required);
			}

			if (choices && typeof option.addChoices === 'function') {
				option.addChoices(...choices);
			}

			if (channelTypes && typeof option.addChannelTypes === 'function') {
				option.addChannelTypes(...channelTypes);
			}

		if (type === ApplicationCommandOptionType.String && (minLength || maxLength)) {
				if (minLength && typeof option.setMinLength === 'function') option.setMinLength(minLength);
				if (maxLength && typeof option.setMaxLength === 'function') option.setMaxLength(maxLength);
			}

			// Recursive call for nested options (Subcommands)
			if (nestedOptions && (type === ApplicationCommandOptionType.Subcommand || type === ApplicationCommandOptionType.SubcommandGroup)) {
				buildOptions(option as unknown as DynamicBuilder, nestedOptions);
			}

			return option;
		});
	}
}

export function createCommand(
	data: CreateCommandProps,
	execute: (interaction: ChatInputCommandInteraction<'cached'>) => Promise<unknown>,
	registry: Collection<string, Command>,
) {
  if (registry.has(data.name)) {
    throw new Error(`Duplicate command registration: ${data.name}`);
  }

	const command = new SlashCommandBuilder()
		.setName(data.name)
		.setDescription(data.description)
		.setDefaultMemberPermissions(data.defaultPermission);

	if (data.options) {
		buildOptions(command as unknown as DynamicBuilder, data.options);
	}

	registry.set(command.name, {
		data: command,
		execute: execute,
	});

	console.log(`Loaded command ${data.name}`);
}
