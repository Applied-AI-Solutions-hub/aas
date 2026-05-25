import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const distDir = new URL("../dist", import.meta.url).pathname;
const clientDir = join(distDir, "client");

if (!existsSync(distDir)) {
  throw new Error("dist directory does not exist. Run astro build first.");
}

rmSync(clientDir, { recursive: true, force: true });
mkdirSync(clientDir, { recursive: true });

for (const entry of readdirSync(distDir)) {
  if (entry === "client") continue;
  cpSync(join(distDir, entry), join(clientDir, entry), { recursive: true });
}
