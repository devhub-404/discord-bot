import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';

export interface DiscordInteractionUser {
  id: string;
  username: string;
  global_name?: string | null;
  bot?: boolean;
}

export interface DiscordInteractionOption {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: DiscordInteractionOption[];
}

export interface DiscordInteractionData {
  name?: string;
  type?: number;
  options?: DiscordInteractionOption[];
  target_id?: string;
}

export interface DiscordInteractionPayload {
  id: string;
  application_id: string;
  type: number;
  token: string;
  version: number;
  guild_id?: string;
  channel_id?: string;
  user?: DiscordInteractionUser;
  member?: {
    user?: DiscordInteractionUser;
    nick?: string | null;
  };
  data?: DiscordInteractionData;
}

export interface DiscordMessageResponse {
  content?: string;
  flags?: number;
  allowed_mentions?: {
    parse?: string[];
  };
}

export interface HttpCommandInteraction {
  readonly id: string;
  readonly applicationId: string;
  readonly token: string;
  readonly guildId?: string;
  readonly channelId?: string;
  readonly user?: DiscordInteractionUser;
  readonly member?: DiscordInteractionPayload['member'];
  readonly commandName: string;
  readonly targetId?: string;
  readonly commandData: DiscordInteractionData;
  readonly options: {
    getString(name: string, required?: boolean): string | null;
  };
  readonly replied: boolean;
  readonly deferred: boolean;
  reply(response: DiscordMessageResponse): Promise<void>;
  deferReply(options?: { ephemeral?: boolean }): Promise<void>;
  editReply(response: DiscordMessageResponse): Promise<void>;
  followUp(response: DiscordMessageResponse): Promise<void>;
}

export interface HttpCommandData {
  name: string;
  toJSON?(): RESTPostAPIChatInputApplicationCommandsJSONBody;
}

export interface HttpCommand {
  data: HttpCommandData;
  execute(interaction: HttpCommandInteraction): Promise<unknown>;
}
