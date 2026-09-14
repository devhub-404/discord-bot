import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import test from 'node:test';
import { createContainer } from '../src/app/container';
import type { BotConfig } from '../src/app/env';
import { createHttpInteractionHandler } from '../src/shared/handlers/http-interactions';
import { verifyDiscordSignature } from '../src/shared/infrastructure/discord/discord-interaction.client';

const config = {
  discord: {
    token: 'token',
    clientId: 'client',
    guildId: 'guild',
    publicKey: '0'.repeat(64),
    httpPort: 3000,
  },
  ai: {
    model: 'model',
    reasoningEffort: 'none',
    maxCompletionTokens: 512,
    timeoutMs: 1000,
  },
} satisfies BotConfig;

function responseDouble(): { response: never; status: () => number; body: () => string } {
  let responseStatus = 0;
  let responseBody = '';
  const response = {
    headersSent: false,
    writeHead(status: number) {
      responseStatus = status;
    },
    end(body?: string) {
      responseBody = body ?? '';
      this.headersSent = true;
    },
  } as never;

  return {
    response,
    status: () => responseStatus,
    body: () => responseBody,
  };
}

function signedRequest(body: string, privateKey: ReturnType<typeof generateKeyPairSync>['privateKey']) {
  const timestamp = String(Date.now());
  const signature = sign(null, Buffer.from(`${timestamp}${body}`), privateKey).toString('hex');
  return {
    method: 'POST',
    headers: {
      'x-signature-ed25519': signature,
      'x-signature-timestamp': timestamp,
    },
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(body);
    },
  } as never;
}

test('validates Discord Ed25519 signatures', () => {
  const { publicKey: key, privateKey } = generateKeyPairSync('ed25519');
  const publicKey = key.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
  const body = '{"type":1}';
  const timestamp = '1234567890';
  const signature = sign(null, Buffer.from(`${timestamp}${body}`), privateKey).toString('hex');

  assert.equal(verifyDiscordSignature(body, signature, timestamp, publicKey), true);
  assert.equal(verifyDiscordSignature(body, signature.slice(0, -2) + '00', timestamp, publicKey), false);
});

test('answers the Discord PING through the HTTP endpoint', async () => {
  const { publicKey: key, privateKey } = generateKeyPairSync('ed25519');
  const publicKey = key.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
  const body = JSON.stringify({ type: 1 });
  const request = signedRequest(body, privateKey);
  const output = responseDouble();
  const handler = createHttpInteractionHandler(
    { ...config, discord: { ...config.discord, publicKey } },
    createContainer(),
  );

  await handler(request, output.response);

  assert.equal(output.status(), 200);
  assert.deepEqual(JSON.parse(output.body()), { type: 1 });
});

test('acknowledges a command before its handler completes', async () => {
  const { publicKey: key, privateKey } = generateKeyPairSync('ed25519');
  const publicKey = key.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
  const body = JSON.stringify({
    id: 'interaction',
    application_id: 'client',
    type: 2,
    token: 'interaction-token',
    version: 1,
    data: { name: 'ask', options: [] },
  });
  const request = signedRequest(body, privateKey);
  const output = responseDouble();
  let executed = false;
  const container = createContainer();
  container.httpCommands.set('ask', {
    data: { name: 'ask' },
    execute: async (interaction) => {
      executed = true;
      assert.equal(interaction.deferred, true);
    },
  });

  await createHttpInteractionHandler(
    { ...config, discord: { ...config.discord, publicKey } },
    container,
  )(request, output.response);

  assert.equal(output.status(), 200);
  assert.deepEqual(JSON.parse(output.body()), { type: 5, data: {} });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(executed, true);
});
