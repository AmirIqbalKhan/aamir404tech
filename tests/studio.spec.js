import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

const services = ["products", "ai", "websites", "tools", "commerce"];

for (const width of [375, 768, 1440]) {
  test("responsive content and all services at " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const response = await page.goto("/");
    expect(response.headers()["content-security-policy"]).toContain(
      "script-src 'self'",
    );
    await expect(page.locator("h1")).toHaveText(
      /Digital products\.\s*Built for\s*what’s next\./,
    );
    await expect(page.locator('[data-shader="hero"]')).toHaveAttribute(
      "data-state",
      "fallback",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    for (const id of services) {
      await page.locator("#tab-" + id).click();
      await expect(page.locator("#panel-" + id)).toBeVisible();
      await expect(page.locator('[role="tabpanel"]:visible')).toHaveCount(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
    for (const summary of await page.locator(".note-detail summary").all()) {
      await summary.click();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await expect(page.locator(".note-detail[open]")).toHaveCount(7);
    for (const summary of await page.locator(".note-detail summary").all()) {
      await summary.click();
    }
    await page.locator("#tab-products").click();
    await page.locator(".brand").first().click();
    await mkdir("qa", { recursive: true });
    await page.screenshot({
      path: "qa/layout-" + width + ".png",
      fullPage: true,
    });
    await page.screenshot({ path: "qa/hero-" + width + ".png" });
    await expect(page.locator("h1")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("keyboard tabs change content, focus, and contact subject", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#tab-products").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#tab-ai")).toBeFocused();
  await expect(page.locator("#tab-ai")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("#contact-email")).toHaveAttribute(
    "href",
    /AI%20experiences/,
  );
  await page.keyboard.press("End");
  await expect(page.locator("#tab-commerce")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#tab-products")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#tab-commerce")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.locator("#tab-products")).toBeFocused();
});

test("mobile menu closes consistently with Escape, navigation, and outside click", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const toggle = page.locator(".menu-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.locator('.main-nav a[href="#work"]').click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await page.locator(".section-heading").first().click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("copy email reports success only after the clipboard resolves", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text) => {
          window.copiedText = text;
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Copy email address" }).click();
  await expect(page.getByRole("status")).toHaveText("Email address copied.");
  expect(await page.evaluate(() => window.copiedText)).toBe(
    "hello@404tech.dev",
  );
});

test("clipboard rejection leaves a useful manual fallback", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("Denied");
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Copy email address" }).click();
  await expect(page.getByRole("status")).toContainText("Couldn’t copy.");
  await expect(page.locator(".email-row a")).toHaveAttribute(
    "href",
    "mailto:hello@404tech.dev",
  );
});

test("reduced motion does not download the shader runtime", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const scripts = [];
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator('[data-shader="hero"]')).toHaveAttribute(
    "data-state",
    "fallback",
  );
  expect(scripts.some((url) => url.includes("shader-runtime"))).toBeFalsy();
  await expect(page.locator(".motion-toggle")).toBeHidden();
});

test("unavailable WebGPU preserves the static artwork and content", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "gpu", { value: undefined }),
  );
  await page.goto("/");
  await expect(page.locator('[data-shader="hero"]')).toHaveAttribute(
    "data-state",
    "fallback",
  );
  await expect(page.locator(".hero-fallback")).toHaveCSS("opacity", "1");
  await expect(page.locator(".hero-fallback img")).toBeVisible();
  await expect(page.locator("h1")).toBeVisible();
});

test("GPU adapter failure falls back without breaking navigation", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "gpu", {
      value: { requestAdapter: async () => null },
    }),
  );
  await page.goto("/");
  await expect(page.locator('[data-shader="hero"]')).toHaveAttribute(
    "data-state",
    "fallback",
    { timeout: 15000 },
  );
  await page.locator("#tab-ai").click();
  await expect(page.locator("#panel-ai")).toBeVisible();
});

test("content, anchor links, and article disclosures work without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");
  for (const id of services)
    await expect(page.locator("#panel-" + id)).toBeVisible();
  await expect(page.locator(".main-nav")).toBeVisible();
  await expect(page.locator(".menu-toggle")).toBeHidden();
  await page.locator(".note-detail summary").first().click();
  await expect(page.locator(".note-detail").first()).toHaveAttribute(
    "open",
    "",
  );
  expect(
    await page
      .locator("html")
      .evaluate((element) => element.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await context.close();
});

test("existing anchors and structured data remain valid", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#panel-websites");
  await expect(page.locator("#panel-websites")).toBeVisible();
  for (const id of [
    "top",
    "about",
    "work",
    "focus",
    "studio",
    "now",
    "more",
    "approach",
    "contact",
  ])
    await expect(page.locator("#" + id)).toHaveCount(1);
  const schema = JSON.parse(
    await page.locator('script[type="application/ld+json"]').textContent(),
  );
  expect(
    schema["@graph"].find((entity) => entity["@type"] === "Organization").name,
  ).toBe("404 Tech");
  for (const asset of [
    "/robots.txt",
    "/sitemap.xml",
    "/feed.xml",
    "/llms.txt",
    "/llms-full.txt",
    "/og-image.png",
    "/favicon.svg",
    "/metal-orbit.svg",
  ])
    expect((await page.request.get(asset)).status()).toBe(200);
});

test("primary page and service tabs meet WCAG AA automated checks", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const id of services) {
    await page.locator("#tab-" + id).click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
});
