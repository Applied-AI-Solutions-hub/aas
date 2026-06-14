import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath (not URL.pathname) so this works on Windows too — pathname yields
// a leading-slash "/C:/..." path that existsSync can't resolve.
const distDir = fileURLToPath(new URL("../dist", import.meta.url));
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
