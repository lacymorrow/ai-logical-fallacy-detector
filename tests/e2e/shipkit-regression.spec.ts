/**
 * Regression tests for the routes this app actually serves.
 *
 * This app is a single-page tool (`/`) plus `/api/analyze-fallacies`.
 * It has no /pricing, /sign-in or /dashboard (LAC-8808), so those
 * template specs were removed instead of skipped.
 */
import { expect, test } from "@playwright/test";

test.describe("SEO: title and meta description present", () => {
  test("/ has <title> and <meta name=\"description\">", async ({ page }) => {
    await page.goto("/");

    const title = await page.title();
    expect(title, "/: <title> is empty").toBeTruthy();
    expect(title.length, "/: <title> is too short").toBeGreaterThan(3);

    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription, '/: missing <meta name="description">').toHaveCount(1);

    const content = await metaDescription.getAttribute("content");
    expect(content, "/: meta description is empty").toBeTruthy();
    expect(content?.length, "/: meta description is too short").toBeGreaterThan(10);
  });
});
