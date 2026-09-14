import { type Client, type Message, type TextChannel } from 'discord.js';
import { directMentionPrompt, replyToIAPrompt, replyToOtherUserPrompt } from '../../application/prompts/prompts';
import type { AiRequest } from '../../application/ports/ai-client.port';
import {
  resolveMessageContext,
  type MentionedEntityContext,
  type ResolvedMessageContext,
} from './resolve-message-context';

function formatMentions(content: string, message: Message): string {
  let formatted = content;

  message.mentions.users.forEach((user) => {
    const name = user.globalName ?? user.username;
    formatted = formatted.replace(new RegExp(`<@!?${user.id}>`, 'g'), () => name);
  });

  message.mentions.roles.forEach((role) => {
    formatted = formatted.replace(new RegExp(`<@&${role.id}>`, 'g'), () => `@${role.name}`);
  });

  message.mentions.channels.forEach((channel) => {
    const name = 'name' in channel && channel.name ? channel.name : channel.id;
    formatted = formatted.replace(new RegExp(`<#${channel.id}>`, 'g'), () => `#${name}`);
  });

  return formatted;
}

function serializeMention(entity: MentionedEntityContext): Record<string, unknown> {
  return {
    type: entity.type,
    id: entity.id,
    name: entity.name,
    ...(entity.username ? { username: entity.username } : {}),
    ...(entity.isBot !== undefined ? { isBot: entity.isBot } : {}),
    ...(entity.guildDisplayName ? { guildDisplayName: entity.guildDisplayName } : {}),
    ...(entity.channelType ? { channelType: entity.channelType } : {}),
  };
}

export default async function buildMessageContext(
  message: Message,
  client: Client,
  resolvedContext?: ResolvedMessageContext,
): Promise<AiRequest> {
  const channel = message.channel as TextChannel;
  const botId = client.user?.id;
  const context = resolvedContext ?? (await resolveMessageContext(message));
  const cleanMessage = formatMentions(
    botId ? message.content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim() : message.content,
    message,
  );

  const request: AiRequest & { data: Record<string, unknown> & { referencedMessage: object | null } } = {
    system: directMentionPrompt,
    data: {
      channel: { category: channel.parent?.name, name: channel.name },
      user: {
        id: message.author.id,
        name: message.member?.displayName ?? message.author.username,
        username: message.author.username,
        isBot: message.author.bot,
        message: cleanMessage,
      },
      mentions: context.mentionedEntities.map(serializeMention),
      referencedMessage: context.referencedMessageContext,
    },
  };

  if (context.referencedMessage) {
    request.system = context.referencedMessage.author.id === botId ? replyToIAPrompt : replyToOtherUserPrompt;

    if (context.referencedMessageContext) {
      request.data.referencedMessage = {
        ...context.referencedMessageContext,
        content: formatMentions(context.referencedMessage.content, context.referencedMessage),
      };
    }
  }

  return request;
}
