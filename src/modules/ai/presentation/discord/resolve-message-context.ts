import {
  type Channel,
  type GuildChannel,
  type GuildMember,
  type Message,
  type Role,
  type User,
} from 'discord.js';

export interface MentionedEntityContext {
  type: 'user' | 'role' | 'channel';
  id: string;
  name: string;
  username?: string;
  isBot?: boolean;
  guildDisplayName?: string;
  channelType?: string;
}

export interface ReferencedMessageContext {
  id: string;
  author: {
    id: string;
    name: string;
    username: string;
    isBot: boolean;
  };
  content: string;
}

export interface ResolvedMessageContext {
  referencedMessage: Message | null;
  referencedMessageContext: ReferencedMessageContext | null;
  mentionedEntities: MentionedEntityContext[];
}

function getUserName(user: User): string {
  return user.globalName ?? user.username;
}

function getMemberName(member: GuildMember | undefined, user: User): string {
  return member?.displayName ?? getUserName(user);
}

function resolveUsers(message: Message): MentionedEntityContext[] {
  return [...message.mentions.users.values()].map((user) => {
    const member = message.mentions.members?.get(user.id);

    return {
      type: 'user',
      id: user.id,
      name: getMemberName(member, user),
      username: user.username,
      isBot: user.bot,
      ...(member && member.displayName !== getUserName(user)
        ? { guildDisplayName: member.displayName }
        : {}),
    };
  });
}

function resolveRoles(message: Message): MentionedEntityContext[] {
  return [...message.mentions.roles.values()].map((role: Role) => ({
    type: 'role',
    id: role.id,
    name: role.name,
  }));
}

function resolveChannels(message: Message): MentionedEntityContext[] {
  return [...message.mentions.channels.values()].map((channel: Channel | GuildChannel) => ({
    type: 'channel',
    id: channel.id,
    name: 'name' in channel && channel.name ? channel.name : channel.id,
    ...(channel.isTextBased() ? { channelType: String(channel.type) } : {}),
  }));
}

export function resolveMentionedEntities(message: Message): MentionedEntityContext[] {
  return [...resolveUsers(message), ...resolveRoles(message), ...resolveChannels(message)];
}

export async function resolveReferencedMessage(message: Message): Promise<Message | null> {
  if (!message.reference?.messageId) return null;

  try {
    return await message.channel.messages.fetch(message.reference.messageId);
  } catch (error) {
    console.warn('Could not load the referenced message:', error);
    return null;
  }
}

export function toReferencedMessageContext(reference: Message): ReferencedMessageContext {
  const username = reference.author.username;

  return {
    id: reference.id,
    author: {
      id: reference.author.id,
      name: reference.member?.displayName ?? reference.author.globalName ?? username,
      username,
      isBot: reference.author.bot,
    },
    content: reference.content,
  };
}

export async function resolveMessageContext(message: Message): Promise<ResolvedMessageContext> {
  const referencedMessage = await resolveReferencedMessage(message);

  return {
    referencedMessage,
    referencedMessageContext: referencedMessage ? toReferencedMessageContext(referencedMessage) : null,
    mentionedEntities: resolveMentionedEntities(message),
  };
}
