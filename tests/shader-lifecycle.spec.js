import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

// Exercise the real scheduling module with a controllable GPU boundary.
async function mockGPU(page) {
  const source = await readFile("shader-runtime.js", "utf8");
  const mock = `const getWebGPUSupport = async () => ({supported:true});
  const createSharedDevice = async () => ({device:{destroy(){}},adapter:{}});
  window.shaderHarness = [];
  async function createShader(canvas, composition, options) {
    const entry = { name:canvas.parentElement.dataset.shader, composition, telemetry:options.disableTelemetry, paused:false, failure:null, destroyed:false };
    const instance = {pause(){entry.paused=true},resume(){entry.paused=false},resize(){},destroy(){entry.destroyed=true},getFailureReason(){return entry.failure}};
    entry.fail = reason => {entry.failure=reason;options.onError(reason)};
    window.shaderHarness.push(entry);
    queueMicrotask(options.onReady);
    return instance;
  }`;
  await page.addInitScript(() => {
    if (!navigator.gpu) Object.defineProperty(navigator, "gpu", { value: {} });
  });
  await page.route("**/assets/shader-runtime-*.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: source.replace(/^import[^;]+;/, mock),
    }),
  );
}

test("shader pause, offscreen, hidden-tab, and reduced-motion lifecycle", async ({
  page,
}) => {
  await mockGPU(page);
  await page.goto("/");
  const hero = page.locator('[data-shader="hero"]');
  await expect(hero).toHaveAttribute("data-state", "ready");
  await expect(hero).toHaveAttribute("data-animating", "true");
  await page.getByRole("button", { name: "Pause animated visuals" }).click();
  await expect(hero).toHaveAttribute("data-animating", "false");
  await page.getByRole("button", { name: "Resume animated visuals" }).click();
  await expect(hero).toHaveAttribute("data-animating", "true");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(hero).toHaveAttribute("data-animating", "false");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(hero).toHaveAttribute("data-animating", "true");
  await page.locator("#tab-websites").click();
  await page.locator('[data-shader="creative"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-shader="creative"]')).toHaveAttribute(
    "data-state",
    "ready",
  );
  await page.locator("#contact-email").scrollIntoViewIfNeeded();
  await expect(hero).toHaveAttribute("data-animating", "false");
  expect(
    await page.evaluate(() =>
      window.shaderHarness.every((entry) => entry.telemetry),
    ),
  ).toBeTruthy();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-animating="true"]')).toHaveCount(0);
  await expect(hero).toHaveAttribute("data-state", "fallback");
  expect(
    await page.evaluate(() =>
      window.shaderHarness.every((entry) => entry.destroyed),
    ),
  ).toBeTruthy();
});

test("simultaneous animations stay capped at two desktop and one mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 10000 });
  await mockGPU(page);
  await page.goto("/#panel-websites");
  await expect(page.locator('[data-animating="true"]')).toHaveCount(2);
  await page.setViewportSize({ width: 375, height: 12000 });
  await expect(page.locator('[data-animating="true"]')).toHaveCount(1);
});

test("terminal GPU failure restores the artwork", async ({ page }) => {
  await mockGPU(page);
  await page.goto("/");
  await expect(page.locator('[data-shader="hero"]')).toHaveAttribute(
    "data-state",
    "ready",
  );
  await page.evaluate(() =>
    window.shaderHarness
      .find((entry) => entry.name === "hero")
      .fail("unrecoverable"),
  );
  await expect(page.locator('[data-shader="hero"]')).toHaveAttribute(
    "data-state",
    "fallback",
  );
  await expect(page.locator('[data-shader="hero"]')).toHaveAttribute(
    "data-animating",
    "false",
  );
  await expect(page.locator(".hero-fallback")).toHaveCSS("opacity", "1");
});

test("touch screens never create the pointer ripple layer", async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await mockGPU(page);
  await page.goto("http://127.0.0.1:4173/");
  await page.locator("#tab-websites").click();
  await page.locator('[data-shader="creative"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-shader="creative"]')).toHaveAttribute(
    "data-state",
    "ready",
  );
  expect(
    await page.evaluate(
      () =>
        window.shaderHarness.find((entry) => entry.name === "creative")
          .composition.components[0].type,
    ),
  ).toBe("FlowingGradient");
  await context.close();
});
