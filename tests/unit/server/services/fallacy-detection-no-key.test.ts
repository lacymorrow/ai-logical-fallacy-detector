import { afterEach, describe, expect, it, vi } from "vitest";

// Regression (LAC-8804): the OpenAI SDK throws from its constructor when no key is
// set, so a module-scope client broke `next build` page-data collection.
const sdkConstructor = vi.fn().mockImplementation(function () {
  throw new Error("Missing credentials. Please pass an `apiKey`");
});

vi.mock("openai", () => ({ default: sdkConstructor }));
vi.mock("@/env", () => ({ env: { OPENAI_API_KEY: undefined } }));
vi.mock("@/server/services/cache-service", () => ({
  cacheService: {
    getCachedAnalysis: vi.fn().mockResolvedValue(null),
    cacheAnalysis: vi.fn(),
  },
}));

describe("fallacy-detection without OPENAI_API_KEY", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("imports cleanly and never constructs the SDK client", async () => {
    const mod = await import("@/server/services/fallacy-detection");
    expect(mod.isOpenAIAvailable()).toBe(false);
    expect(sdkConstructor).not.toHaveBeenCalled();
  });

  it("analyzeFallacies rejects with OpenAIUnavailableError, not a generic failure", async () => {
    const { analyzeFallacies, OpenAIUnavailableError } =
      await import("@/server/services/fallacy-detection");
    await expect(analyzeFallacies("text")).rejects.toBeInstanceOf(OpenAIUnavailableError);
  });
});
