import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FallacyDetector } from "@/components/fallacy-detector/fallacy-detector";

const TEXT = "Everyone believes this, so it must be true, and anyone who disagrees is foolish.";

interface Call {
  signal: AbortSignal;
  fail: (e: Error) => void;
}

describe("FallacyDetector stream lifecycle (LAC-8741)", () => {
  const calls: Call[] = [];

  beforeEach(() => {
    calls.length = 0;
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = init.signal as AbortSignal;
          calls.push({ signal, fail: reject });
        });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("starts one stream, aborts it on mid-stream failure, and starts one fresh stream on re-analyze", async () => {
    render(<FallacyDetector />);
    const box = screen.getByPlaceholderText(/Enter any text/);
    fireEvent.change(box, { target: { value: TEXT } });

    fireEvent.click(screen.getByRole("button", { name: /Analyze Text/ }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.signal.aborted).toBe(false);

    // Mid-stream failure: parent cleanup must abort the first controller.
    await act(async () => {
      calls[0]?.fail(new Error("network dropped"));
    });
    await waitFor(() => expect(calls[0]?.signal.aborted).toBe(true));

    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: /Analyze Text/ }) as HTMLButtonElement).disabled
      ).toBe(false)
    );
    fireEvent.click(screen.getByRole("button", { name: /Analyze Text/ }));
    await waitFor(() => expect(calls).toHaveLength(2));

    expect(calls[1]?.signal).not.toBe(calls[0]?.signal);
    expect(calls[1]?.signal.aborted).toBe(false);
    // Exactly one fetch per analysis: no double start from the prop change.
    await new Promise((r) => setTimeout(r, 100));
    expect(calls).toHaveLength(2);
  });
});
