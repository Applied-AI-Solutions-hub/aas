import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://appliedai.solutions",
  devToolbar: {
    enabled: false,
  },
  integrations: [sitemap()],
});
