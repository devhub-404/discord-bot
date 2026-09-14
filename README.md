# DevHub 404 AI — Discord Bot

The DevHub 404 Discord bot is a standalone community service. It connects the
DevHub community to an AI assistant through Discord HTTP Interactions. It is an
independent repository, not a Git submodule of the main application.

## Capabilities

- **404 AI:** responds to the `/ask` application command using Cloudflare
  Workers AI.

## Stack

- Node.js and TypeScript
- discord.js 14
- Discord HTTP Interactions and REST
- Cloudflare Workers AI
- dotenv for environment configuration

The code is organized by capability under `src/modules/`, with shared command,
HTTP interaction, type, and service infrastructure under `src/shared/`.

```text
index.ts
src/
  app/             configuration, dependency container, bootstrap and modules
  modules/
    ai/            application, Cloudflare adapter and Discord command
                   presentation
  shared/          HTTP interaction infrastructure and shared utilities
tests/             behavior-oriented tests, independent of the source layout
```

## Architecture and registration

`index.ts` loads configuration and starts the application. `app/bootstrap.ts`
composes the HTTP server and modules without network calls, while
`app/register-modules.ts` is the single module composition point. Every module
receives the same `RegistrationContext` and registers its HTTP commands
explicitly; importing a file never registers runtime behavior as a side effect.

`BotApplication` synchronizes application commands through Discord REST, starts
the HTTP interaction endpoint, and then calls module `start()` hooks. Long AI
operations are acknowledged immediately with a deferred interaction and finish
by editing the original response. On shutdown it calls `stop()` hooks in
reverse order and closes the HTTP server.

The AI module keeps provider ports in `application/`, the Cloudflare adapter in
`infrastructure/`, and the Discord command entrypoint in
`presentation/discord/`. To add a command, create its handler and Discord
builder, then call `createHttpCommand(..., container.httpCommands)` from the
module's command registrar.

## Requirements

- Node.js LTS
- pnpm
- A Discord application, bot token and public key
- A target Discord server where guild commands will be registered
- A Cloudflare account with Workers AI enabled and an AI binding configured

Configure the deployed public URL as the application's Discord Interactions
Endpoint URL, pointing to `/interactions`. The endpoint must be reachable over
HTTPS. No Gateway connection or privileged Gateway intents are required for the
HTTP command flow.

## Configuration

Create a local environment file from the template:

```bash
cp .env.example .env
```

Required Discord configuration:

- `DISCORD_TOKEN`: bot token.
- `CLIENT_ID`: Discord application ID.
- `GUILD_ID`: server where slash commands are registered.
- `DISCORD_PUBLIC_KEY`: application public key used to validate HTTP
  interaction signatures.
- `DISCORD_HTTP_PORT`: local HTTP port; defaults to `3000`.

Cloudflare AI configuration:

- `CLOUDFLARE_AI_MODEL`: Workers AI model, for example
  `@cf/qwen/qwen3.8-27b`.
- `AI_REASONING_EFFORT`: reasoning level (`none`, `low`, `medium` or `high`).
- `AI_MAX_COMPLETION_TOKENS`: maximum response tokens; defaults to `512`.
- `AI_TIMEOUT_MS`: request timeout in milliseconds; defaults to `30000`.

## Run and test

```bash
pnpm install --frozen-lockfile
pnpm dev       # run from TypeScript with ts-node
pnpm build     # compile to dist/
pnpm start     # run the entrypoint through ts-node/register
pnpm test      # build and run the automated tests
```

The bot registers slash commands for the configured guild on startup, so
command changes normally appear quickly in that server. The test suite covers
the Cloudflare AI client, HTTP signature validation, Interaction ACKs,
response-length handling and application lifecycle.

## Cloudflare Workers deployment

The production entrypoint is `src/worker.ts`. It exposes the signed HTTP
Interaction endpoint without opening a local port or maintaining a process.
The local Node entrypoint remains useful for command registration and HTTP
flow checks. AI inference is provided by the Workers `AI` binding, so use
`wrangler dev` to exercise real AI responses locally.

1. Authenticate Wrangler:

```bash
pnpm dlx wrangler login
```

2. Edit `wrangler.jsonc` and replace the placeholder values in `vars`.

3. Add the Worker secret:

```bash
pnpm dlx wrangler secret put DISCORD_PUBLIC_KEY
```

4. Deploy the Worker:

```bash
pnpm run deploy
```

5. Register the guild command from an environment containing
`DISCORD_TOKEN`, `CLIENT_ID` and `GUILD_ID`:

```bash
pnpm run register:commands
```

6. Configure the Discord **Interactions Endpoint URL** with the deployed
Worker URL followed by `/interactions`.

The `AI` binding gives the Worker access to Workers AI without putting an
account ID or AI API token in the application runtime. Wrangler authentication
is separate and still needs permission to deploy this Worker.

## Contribution

Discuss changes to commands, permissions, AI behavior, or external
integrations before implementing them. Changes that affect the community,
Discord permissions, security, or infrastructure require explicit review.

Pull requests should explain the behavior being changed, include or update
tests, describe the verification performed, and use the repository commit
format:

```text
type(scope): short description
```

Use `feat`, `fix`, `test`, `refactor`, `perf`, `docs`, `chore`, `build`, `ci`,
`style`, or `revert`.

## Security

- Never commit `.env` files, bot tokens, or API keys.
- Keep credentials in the runtime environment or deployment secrets.
- Do not log prompts, model responses, or credentials.
- Review Discord permissions whenever adding or changing a command.
