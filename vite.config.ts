import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    copyPublicDir: false /* in the lib we don't care about any assets */,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es", "cjs"] /* target modern browsers & node */,
    },
  },
});
