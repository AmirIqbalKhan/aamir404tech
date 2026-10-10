import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: 1200, height: 675 },
  deviceScaleFactor: 1,
});
const orbit = await readFile(
  new URL("../public/metal-orbit.svg", import.meta.url),
  "utf8",
);
const favicon = await readFile(
  new URL("../public/favicon.svg", import.meta.url),
  "utf8",
);
await page.setContent(
  `<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box}body{margin:0;width:1200px;height:675px;background:#090b10;color:#f1f3f8;font-family:Inter,Arial,sans-serif;padding:52px 64px;overflow:hidden}.brand{display:flex;align-items:center;gap:12px;font:700 34px 'Space Grotesk',sans-serif;letter-spacing:-2px}.brand svg{width:34px;height:34px}.brand small{font:500 13px Inter;letter-spacing:3px;margin-left:6px}h1{font:500 78px/1.07 'Space Grotesk',sans-serif;letter-spacing:-4px;margin:72px 0 22px;position:relative;z-index:2}h1 span{color:#9eb9ff}p{font-size:16px;color:#9ba6bd;line-height:1.8;margin:0}.art{position:absolute;right:-28px;top:88px;width:620px;height:530px;background:radial-gradient(ellipse,#274b8533,transparent 65%)}.art svg{width:100%;height:100%}.footer{position:absolute;bottom:46px;left:64px;right:64px;border-top:1px solid #ffffff19;padding-top:22px;display:flex;justify-content:space-between;color:#8793ab;font-size:11px;letter-spacing:1px}.dot{color:#85cfaa;margin-right:8px}</style></head><body><div class="brand">${favicon}404<small>TECH</small></div><h1>Digital products.<br>Built for<br><span>what’s next.</span></h1><p>Websites, applications & AI experiences.<br>Independent studio. End-to-end ownership.</p><div class="art">${orbit}</div><div class="footer"><span><span class="dot">●</span> BUILT BY AMIR · BASED IN PAKISTAN</span><span>hello@404tech.dev ↗</span></div></body></html>`,
);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: "public/og-image.png" });
await page.setViewportSize({ width: 180, height: 180 });
await page.setContent(
  "<style>body{margin:0;background:#090b10}svg{width:180px;height:180px}</style>" +
    favicon,
);
const png = await page.screenshot({ path: "public/apple-touch-icon.png" });
await page.setViewportSize({ width: 32, height: 32 });
await page.setContent(
  "<style>body{margin:0}svg{width:32px;height:32px}</style>" + favicon,
);
const icon = await page.screenshot({ omitBackground: true });
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = 32;
header[7] = 32;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(icon.length, 14);
header.writeUInt32LE(22, 18);
await writeFile("public/favicon.ico", Buffer.concat([header, icon]));
for (const name of ["og-image.png", "favicon.ico", "apple-touch-icon.png"])
  await writeFile(name, await readFile("public/" + name));
await browser.close();
console.log("Generated social preview, touch icon, and favicon.");
