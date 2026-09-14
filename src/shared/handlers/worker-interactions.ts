import type { BotConfig } from '../../app/env';
import type { RegistrationContext } from '../../app/container';
import { createHttpCommandInteraction } from '../infrastructure/discord/discord-interaction.client';
import type { DiscordInteractionPayload } from '../types/http-interaction';

interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

function response(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function hexToBytes(value: string): ArrayBuffer {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

async function verifySignature(
  body: string,
  signature: string | null,
  timestamp: string | null,
  publicKey: string,
): Promise<boolean> {
  if (!signature || !timestamp || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  if (!/^[a-f0-9]{64}$/i.test(publicKey)) return false;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      hexToBytes(publicKey),
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    return crypto.subtle.verify(
      'Ed25519',
      key,
      hexToBytes(signature),
      new TextEncoder().encode(`${timestamp}${body}`).buffer as ArrayBuffer,
    );
  } catch {
    return false;
  }
}

export async function createWorkerInteractionHandler(
  request: Request,
  config: BotConfig,
  container: RegistrationContext,
  executionContext: WorkerExecutionContext,
): Promise<Response> {
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  const body = await request.text();
  const valid = await verifySignature(
    body,
    request.headers.get('X-Signature-Ed25519'),
    request.headers.get('X-Signature-Timestamp'),
    config.discord.publicKey,
  );
  if (!valid) return response({ error: 'Invalid request signature' }, 401);

  let payload: DiscordInteractionPayload;
  try {
    payload = JSON.parse(body) as DiscordInteractionPayload;
  } catch {
    return response({ error: 'Invalid JSON' }, 400);
  }

  if (payload.type === 1) return response({ type: 1 });
  if (payload.type !== 2 || !payload.data?.name) {
    return response({ error: 'Unsupported interaction' }, 400);
  }

  const command = container.httpCommands.get(payload.data.name);
  if (!command) {
    return response({
      type: 4,
      data: { content: 'Command not found.', flags: 64 },
    });
  }

  const interaction = createHttpCommandInteraction(payload, { deferred: true });
  executionContext.waitUntil(command.execute(interaction).catch(async (error) => {
    console.error(`Error executing Worker command ${payload.data?.name}:`, error);
    try {
      await interaction.editReply({ content: 'An error occurred while executing this command.' });
    } catch (editError) {
      console.error('Could not edit the failed Worker interaction:', editError);
    }
  }));

  return response({ type: 5, data: {} });
}
