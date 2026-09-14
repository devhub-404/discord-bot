import { createPublicKey, verify } from 'node:crypto';
import type {
  DiscordInteractionOption,
  DiscordInteractionPayload,
  DiscordMessageResponse,
  HttpCommandInteraction,
} from '../../types/http-interaction';

const DISCORD_API_URL = 'https://discord.com/api/v10';
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export function verifyDiscordSignature(
  body: string,
  signature: string | undefined,
  timestamp: string | undefined,
  publicKey: string,
): boolean {
  if (!signature || !timestamp || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  if (!/^[a-f0-9]{64}$/i.test(publicKey)) return false;

  try {
    const key = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKey, 'hex')]),
      format: 'der',
      type: 'spki',
    });
    return verify(
      null,
      Buffer.from(`${timestamp}${body}`),
      key,
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}

function findOption(
  options: DiscordInteractionOption[] | undefined,
  name: string,
): DiscordInteractionOption | undefined {
  for (const option of options ?? []) {
    if (option.name === name) return option;
    const nested = findOption(option.options, name);
    if (nested) return nested;
  }
  return undefined;
}

async function discordRequest(
  path: string,
  method: 'POST' | 'PATCH',
  body: object,
): Promise<void> {
  const response = await fetch(`${DISCORD_API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Discord interaction request failed (${response.status}): ${details}`);
  }
}

export function createHttpCommandInteraction(
  payload: DiscordInteractionPayload,
  options: { deferred?: boolean } = {},
): HttpCommandInteraction {
  if (!payload.data?.name) throw new Error('Discord interaction has no command name');

  let replied = false;
  let deferred = options.deferred ?? false;
  const responsePath = `/interactions/${payload.id}/${payload.token}/callback`;
  const webhookPath = `/webhooks/${payload.application_id}/${payload.token}`;

  const interaction: HttpCommandInteraction = {
    id: payload.id,
    applicationId: payload.application_id,
    token: payload.token,
    guildId: payload.guild_id,
    channelId: payload.channel_id,
    user: payload.user ?? payload.member?.user,
    member: payload.member,
    commandName: payload.data.name,
    targetId: payload.data.target_id,
    commandData: payload.data,
    options: {
      getString(name, required = false): string | null {
        const option = findOption(payload.data?.options, name);
        const value = typeof option?.value === 'string' ? option.value : null;
        if (required && !value) throw new Error(`Required command option is missing: ${name}`);
        return value;
      },
    },
    get replied() { return replied; },
    get deferred() { return deferred; },
    async reply(response: DiscordMessageResponse): Promise<void> {
      if (replied || deferred) throw new Error('Interaction was already acknowledged');
      await discordRequest(responsePath, 'POST', { type: 4, data: response });
      replied = true;
    },
    async deferReply(options = {}): Promise<void> {
      if (replied) throw new Error('Interaction was already acknowledged');
      if (deferred) return;
      await discordRequest(responsePath, 'POST', {
        type: 5,
        data: options.ephemeral ? { flags: 64 } : {},
      });
      deferred = true;
    },
    async editReply(response: DiscordMessageResponse): Promise<void> {
      if (!replied && !deferred) throw new Error('Interaction was not acknowledged');
      await discordRequest(`${webhookPath}/messages/@original`, 'PATCH', response);
      replied = true;
    },
    async followUp(response: DiscordMessageResponse): Promise<void> {
      await discordRequest(webhookPath, 'POST', response);
    },
  };

  return interaction;
}
