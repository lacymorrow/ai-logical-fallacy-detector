/**
 * E2E smoke suite for the routes this app serves: `/`, `/robots.txt` and
 * the not-found page. Catches a server that fails to boot or a top-level
 * route that 500s. Runs against a Postgres testcontainer from globalSetup.
 */

import { expect, test } from "@playwright/test";

test.describe("public routes render", () => {
  test("/ — home page responds 200 and renders body", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("/robots.txt is served", async ({ page }) => {
    const response = await page.request.get("/robots.txt");
    expect(response.status()).toBe(200);
    expect(await response.text()).toMatch(/user-agent/i);
  });
});

test.describe("error contract", () => {
  test("a nonexistent route renders not-found UI (Next renders 200 by design)", async ({
    page,
  }) => {
    // Cold-compiling an unknown route + the not-found page's WebGL background
    // (rAF loop blocks `load`) can take >30s in dev.
    test.setTimeout(90_000);
    await page.goto("/this-route-truly-does-not-exist-12345", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(page.locator("body")).toContainText(/not found|404|lost in space/i, {
      timeout: 30_000,
    });
  });
});
