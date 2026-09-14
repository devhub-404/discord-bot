import { createServer, type Server } from 'node:http';
import { registerDiscordCommands } from './register-discord-commands';
import type { BotConfig } from './env';
import type { RegistrationContext } from './container';
import type { BotModule, RuntimeContext } from './module';
import { createHttpInteractionHandler } from '../shared/handlers/http-interactions';

type CommandRegistrar = (
  commands: RegistrationContext['httpCommands'],
  config: BotConfig,
) => Promise<void>;

export class BotApplication {
  private startedModules: BotModule[] = [];
  private startPromise: Promise<void> | undefined;
  private stopping = false;
  private server: Server | undefined;

  constructor(
    private readonly config: BotConfig,
    private readonly container: RegistrationContext,
    private readonly moduleCatalog: readonly BotModule[],
    private readonly syncCommands: CommandRegistrar = registerDiscordCommands,
  ) {}

  start(): Promise<void> {
    if (this.startPromise) return this.startPromise;

    this.startPromise = this.startInternal().catch((error) => {
      this.startPromise = undefined;
      throw error;
    });

    return this.startPromise;
  }

  private async startInternal(): Promise<void> {
    await this.syncCommands(this.container.httpCommands, this.config);

    const runtime: RuntimeContext = {
      config: this.config,
      container: this.container,
    };

    for (const module of this.moduleCatalog) {
      this.startedModules.push(module);
      await module.start?.(runtime);
    }

    const handler = createHttpInteractionHandler(this.config, this.container);
    this.server = createServer((request, response) => {
      if (request.url !== '/interactions') {
        response.writeHead(request.url === '/' ? 200 : 404, { 'Content-Type': 'text/plain' });
        response.end(request.url === '/' ? 'DevHub 404 AI is running' : 'Not found');
        return;
      }
      void handler(request, response);
    });

    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(this.config.discord.httpPort, () => resolve());
    });

    console.log(`404 AI HTTP interactions listening on port ${this.config.discord.httpPort}`);
  }

  async stop(): Promise<void> {
    if (this.stopping) return;
    this.stopping = true;

    let firstError: unknown;
    const runtime: RuntimeContext = {
      config: this.config,
      container: this.container,
    };

    for (const module of [...this.startedModules].reverse()) {
      try {
        await module.stop?.(runtime);
      } catch (error) {
        firstError ??= error;
        console.error(`Error stopping module ${module.id}:`, error);
      }
    }

    this.startedModules = [];
    await new Promise<void>((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close((error) => error ? reject(error) : resolve());
      this.server = undefined;
    });
    this.stopping = false;

    if (firstError) throw firstError;
  }
}
