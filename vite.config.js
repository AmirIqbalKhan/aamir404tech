import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

const hosting = JSON.parse(
  readFileSync(new URL("./vercel.json", import.meta.url), "utf8"),
);
const headers = Object.fromEntries(
  hosting.headers[0].headers.map(({ key, value }) => [key, value]),
);

export default defineConfig({
  preview: { headers },
  build: { target: "es2022" },
});
