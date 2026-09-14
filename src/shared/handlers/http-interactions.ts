import type { IncomingMessage, ServerResponse } from 'node:http';
import type { BotConfig } from '../../app/env';
import type { RegistrationContext } from '../../app/container';
import { createHttpCommandInteraction, verifyDiscordSignature } from '../infrastructure/discord/discord-interaction.client';
import type { DiscordInteractionPayload } from '../types/http-interaction';

const MAX_BODY_BYTES = 256 * 1024;

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function json(response: ServerResponse, status: number, body: Record<string, unknown>): void {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error('Request body is too large');
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
}

export function createHttpInteractionHandler(
  config: BotConfig,
  container: RegistrationContext,
): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
  return async (request, response): Promise<void> => {
    if (request.method !== 'POST') {
      json(response, 405, { error: 'Method not allowed' });
      return;
    }

    let body: string;
    try {
      body = await readBody(request);
    } catch (error) {
      json(response, 413, { error: error instanceof Error ? error.message : 'Invalid body' });
      return;
    }

    if (!verifyDiscordSignature(
      body,
      headerValue(request.headers['x-signature-ed25519']),
      headerValue(request.headers['x-signature-timestamp']),
      config.discord.publicKey,
    )) {
      json(response, 401, { error: 'Invalid request signature' });
      return;
    }

    let payload: DiscordInteractionPayload;
    try {
      payload = JSON.parse(body) as DiscordInteractionPayload;
    } catch {
      json(response, 400, { error: 'Invalid JSON' });
      return;
    }

    if (payload.type === 1) {
      json(response, 200, { type: 1 });
      return;
    }

    if (payload.type !== 2 || !payload.data?.name) {
      json(response, 400, { error: 'Unsupported interaction' });
      return;
    }

    const command = container.httpCommands.get(payload.data.name);
    if (!command) {
      json(response, 404, { error: 'Command not found' });
      return;
    }

    const interaction = createHttpCommandInteraction(payload, { deferred: true });

    // HTTP Interactions must be acknowledged immediately. The command continues
    // after this response and edits the deferred message through its token.
    json(response, 200, { type: 5, data: {} });
    void command.execute(interaction).catch(async (error) => {
      console.error(`Error executing HTTP command ${payload.data?.name}:`, error);
      try {
        await interaction.editReply({ content: 'An error occurred while executing this command.' });
      } catch (editError) {
        console.error('Could not edit the failed interaction response:', editError);
      }
    });
  };
}
