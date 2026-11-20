import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirectMock(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock("@/server/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { routes } from "@/config/routes";
import { downloadRepoAnonymously } from "@/server/actions/github/download-repo";

const run = async (entries: Record<string, string | Blob>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  try {
    await downloadRepoAnonymously(fd);
  } catch (e) {
    return e as Error;
  }
  return null;
};

describe("downloadRepoAnonymously", () => {
  beforeEach(() => redirectMock.mockClear());

  it("encodes values so an email cannot override orderId", async () => {
    const err = await run({ email: "a@b.com&orderId=EVIL", orderId: "REAL" });
    const url = redirectMock.mock.calls[0]?.[0] as string;
    expect(err?.message).toContain("NEXT_REDIRECT");
    const params = new URL(url, "http://x").searchParams;
    expect(params.getAll("orderId")).toEqual(["REAL"]);
    expect(params.get("email")).toBe("a@b.com&orderId=EVIL");
    expect(url.startsWith(routes.api.download)).toBe(true);
  });

  it("rejects a non-string entry without redirecting", async () => {
    const err = await run({
      email: new File(["x"], "x.txt"),
      orderId: "REAL",
    });
    expect(err?.message).toMatch(/Invalid download request/);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("rejects a missing entry without redirecting", async () => {
    const err = await run({ email: "a@b.com" });
    expect(err?.message).toMatch(/Invalid download request/);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
