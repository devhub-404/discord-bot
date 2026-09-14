import { Events, Interaction } from 'discord.js';
import { createEvent } from '../handlers/createEvent';
import { dispatchInteraction, type InteractionRegistry } from '../handlers/createInteraction';
import type { BotClient } from '../types';
import type { RegistrationContext } from '../../app/container';

async function replyWithError(interaction: Interaction, content: string): Promise<void> {
  if (!interaction.isRepliable()) return;

  if (interaction.replied || interaction.deferred) {
    await interaction.editReply(content);
  } else {
    await interaction.reply({ content, ephemeral: true });
  }
}

async function execute(
  interaction: Interaction,
  client: BotClient,
  interactionRegistry: InteractionRegistry,
): Promise<void> {
  if (!interaction.isChatInputCommand()) {
    await dispatchInteraction(interaction, client, interactionRegistry);
    return;
  }

  if (!interaction.inCachedGuild()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`Command ${interaction.commandName} was not found.`);
    return replyWithError(interaction, 'Command not found.');
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    await replyWithError(interaction, 'An error occurred while executing this command.');
  }
}

export function registerInteractionCreate(container: RegistrationContext): void {
  createEvent(
    Events.InteractionCreate,
    (interaction, client) => execute(interaction, client, container.interactions),
    container.events,
  );
}
