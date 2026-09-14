import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveMentionedEntities, toReferencedMessageContext } from '../src/modules/ai/presentation/discord/resolve-message-context';

test('resolves users, bots, roles and channels mentioned in a message', () => {
  const message = {
    mentions: {
      users: new Map([
        ['user-1', {
          id: 'user-1',
          username: 'ana',
          globalName: 'Ana Silva',
          bot: false,
        }],
        ['bot-1', {
          id: 'bot-1',
          username: 'helper',
          globalName: null,
          bot: true,
        }],
      ]),
      members: new Map([
        ['user-1', { displayName: 'Ana do DevHub' }],
      ]),
      roles: new Map([
        ['role-1', { id: 'role-1', name: 'Equipe' }],
      ]),
      channels: new Map([
        ['channel-1', {
          id: 'channel-1',
          name: 'geral',
          type: 0,
          isTextBased: () => true,
        }],
      ]),
    },
  } as never;

  assert.deepEqual(resolveMentionedEntities(message), [
    {
      type: 'user',
      id: 'user-1',
      name: 'Ana do DevHub',
      username: 'ana',
      isBot: false,
      guildDisplayName: 'Ana do DevHub',
    },
    {
      type: 'user',
      id: 'bot-1',
      name: 'helper',
      username: 'helper',
      isBot: true,
    },
    { type: 'role', id: 'role-1', name: 'Equipe' },
    { type: 'channel', id: 'channel-1', name: 'geral', channelType: '0' },
  ]);
});

test('keeps basic author information for a referenced message', () => {
  const context = toReferencedMessageContext({
    id: 'message-1',
    author: {
      id: 'bot-1',
      username: '404',
      globalName: '404 AI',
      bot: true,
    },
    member: undefined,
    content: 'Resposta anterior',
  } as never);

  assert.deepEqual(context, {
    id: 'message-1',
    author: {
      id: 'bot-1',
      name: '404 AI',
      username: '404',
      isBot: true,
    },
    content: 'Resposta anterior',
  });
});
