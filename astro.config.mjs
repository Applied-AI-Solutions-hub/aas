import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: "https://appliedai.solutions",
  integrations: [sitemap()],
  adapter: cloudflare(),
});