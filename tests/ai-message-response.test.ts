import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldRespondToAi } from '../src/modules/ai/presentation/discord/message-policy';
import { splitMessage } from '../src/modules/ai/presentation/discord/reply-service';

test('keeps responses up to 2000 characters in one block', () => {
  const text = 'a'.repeat(2_000);
  assert.deepEqual(splitMessage(text), [text]);
});

test('splits responses above the Discord limit', () => {
  const text = 'a'.repeat(2_001);
  const chunks = splitMessage(text);

  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].length, 2_000);
  assert.equal(chunks[1].length, 1);
  assert.equal(chunks.join(''), text);
});

test('does not produce an empty Discord message', () => {
  assert.deepEqual(splitMessage('  \n\n  '), []);
});

test('activates for a direct mention or a reply to the bot', () => {
  const botId = 'bot-1';
  const directMention = {
    mentions: { users: new Map([[botId, {}]]) },
  } as never;
  const unrelatedMessage = {
    mentions: { users: new Map() },
  } as never;
  const botMessage = { author: { id: botId } } as never;
  const otherMessage = { author: { id: 'user-2' } } as never;

  assert.equal(shouldRespondToAi(directMention, botId, null), true);
  assert.equal(shouldRespondToAi(unrelatedMessage, botId, botMessage), true);
  assert.equal(shouldRespondToAi(unrelatedMessage, botId, otherMessage), false);
});
