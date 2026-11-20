import { describe, expect, it } from "vitest";
import { STATUS_CODES } from "@/config/status-codes";

/**
 * Regression guard for LAC-6906.
 *
 * `src/components/buttons/github-oauth-button.tsx` builds its post-OAuth
 * redirect from `STATUS_CODES.CONNECT_GITHUB.code`. The key was present up to
 * 3b45ac2b and was dropped when the repo was rebuilt from the shipkit
 * downstream in e9f41d5f, which left `bun run typecheck` failing on main with
 * TS2339 for eight months. Every key asserted here has a live consumer; if one
 * disappears again, this fails before CI reaches the type error.
 */
describe("STATUS_CODES", () => {
  it("exposes CONNECT_GITHUB for the GitHub OAuth button redirect", () => {
    expect(STATUS_CODES.CONNECT_GITHUB).toBeDefined();
    expect(STATUS_CODES.CONNECT_GITHUB.code).toBe("CONNECT_GITHUB");
    expect(STATUS_CODES.CONNECT_GITHUB.message).toBeTruthy();
  });

  it("keeps every entry's `code` identical to its key", () => {
    for (const [key, value] of Object.entries(STATUS_CODES)) {
      expect(value.code).toBe(key);
    }
  });

  it("gives every entry a non-empty human-readable message", () => {
    for (const [key, value] of Object.entries(STATUS_CODES)) {
      expect(value.message, `${key} has no message`).toBeTruthy();
    }
  });
});
