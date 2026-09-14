import { Collection, REST, Routes } from 'discord.js';
import type { BotConfig } from './env';
import type { HttpCommand } from '../shared/types/http-interaction';

export async function registerDiscordCommands(
  commands: Collection<string, HttpCommand>,
  config: BotConfig,
): Promise<void> {
  const rest = new REST().setToken(config.discord.token);

  try {
    const data = await rest.put(
      Routes.applicationGuildCommands(
        config.discord.clientId,
        config.discord.guildId,
      ),
      { body: commands.map((command) => 'toJSON' in command.data ? command.data.toJSON() : command.data) },
    );

    console.log(
      `Successfully reloaded ${Array.isArray(data) ? data.length : 0} application (/) commands.`,
    );
  } catch (error) {
    console.error('Could not register Discord commands:', error);
    throw error;
  }
}
