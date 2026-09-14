import type { ChatInputCommandInteraction, Client, Collection, SlashCommandBuilder } from 'discord.js';

export interface Command {
	data: SlashCommandBuilder;
	execute: (interaction: ChatInputCommandInteraction<'cached'>) => Promise<unknown>;
}

export type BotClient = Client & {
	commands: Collection<string, Command>;
};
