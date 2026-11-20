import { describe, expect, it, vi } from "vitest";
import { createLog } from "@/server/services/logs/log-service";

// `db` is `undefined` whenever no DATABASE_URL is configured
// (src/server/db/index.ts: `client ? drizzle(...) : undefined`).
vi.mock("@/server/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db")>();
  return { ...actual, db: undefined };
});

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

/**
 * Regression guard for LAC-6906.
 *
 * `createLog` reached the database through `db?.insert(...)` and destructured
 * the result with `const [createdLog] = ...`, which tsc rejected as TS2488 and
 * biome as lint/correctness/noUnsafeOptionalChaining: with no database the
 * chain short-circuits to `undefined` and array destructuring cannot iterate
 * it.
 *
 * Measured, not assumed: that destructuring was in fact unreachable, because
 * the earlier `db?.query.apiKeys.findFirst(...)` also returned `undefined` and
 * the `!apiKeyRecord` branch threw "Invalid API key" first. So the user-visible
 * defect was the wrong diagnosis, not a crash -- a caller with no DATABASE_URL
 * was told its API key was bad. This asserts the honest error instead.
 */
describe("createLog with no database configured", () => {
  it("throws a named error instead of failing to destructure undefined", async () => {
    await expect(
      createLog({
        level: "info",
        message: "hello",
        timestamp: new Date(),
        apiKey: "some-key",
      })
    ).rejects.toThrow("Database is not initialized");
  });

  it("no longer blames the API key when the database is simply absent", async () => {
    await expect(
      createLog({
        level: "info",
        message: "hello",
        timestamp: new Date(),
        apiKey: "some-key",
      })
    ).rejects.not.toThrow("Invalid API key");
  });
});
