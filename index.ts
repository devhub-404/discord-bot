import "dotenv/config";
import { loadConfig } from "./src/app/env";
import { bootstrap } from "./src/app/bootstrap";

async function main(): Promise<void> {
  const config = loadConfig();
  const application = bootstrap(config);

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`Received ${signal}; shutting down 404 AI...`);
    await application.stop();
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await application.start();
}

main().catch((error) => {
  console.error("Failed to start 404 AI:", error);
  process.exitCode = 1;
});
