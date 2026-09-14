import { SlashCommandBuilder } from 'discord.js';
import type { AiClient } from '../../application/ports/ai-client.port';
import { SYSTEM_CORE } from '../../application/prompts/prompts';
import { splitMessage } from './reply-service';
import { createHttpCommand } from '../../../../shared/handlers/createHttpCommand';
import type { HttpCommand } from '../../../../shared/types/http-interaction';

const NO_ANSWER = 'I could not generate a non-empty answer right now.';
const ERROR_ANSWER = 'Sorry, I could not answer right now. Please try again later.';

export function registerAskCommand(
  registry: Parameters<typeof createHttpCommand>[2],
  ai: AiClient,
): void {
  const data = new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask 404 about development and DevHub 404')
    .addStringOption((option) => option
      .setName('question')
      .setDescription('Your question')
      .setRequired(true)
      .setMaxLength(2_000));

  const execute: HttpCommand['execute'] = async (interaction) => {
    await interaction.deferReply();

    try {
      const question = interaction.options.getString('question', true);
      const result = await ai.generate({
        system: SYSTEM_CORE,
        data: {
          source: 'discord-command',
          command: interaction.commandName,
          user: interaction.user ? {
            id: interaction.user.id,
            name: interaction.user.global_name ?? interaction.user.username,
            username: interaction.user.username,
          } : null,
          guildId: interaction.guildId ?? null,
          channelId: interaction.channelId ?? null,
          question,
        },
      });
      const chunks = splitMessage(result.text);

      if (chunks.length === 0) {
        await interaction.editReply({ content: NO_ANSWER });
        return;
      }

      await interaction.editReply({
        content: chunks[0],
        allowed_mentions: { parse: [] },
      });
      for (const chunk of chunks.slice(1)) {
        await interaction.followUp({
          content: chunk,
          allowed_mentions: { parse: [] },
        });
      }
    } catch (error) {
      console.error('Error while answering /ask:', error);
      await interaction.editReply({ content: ERROR_ANSWER });
    }
  };

  createHttpCommand(data, execute, registry);
}
