import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StreamingAnalysis } from "@/components/fallacy-detector/streaming-analysis";
import { type AnalysisResult, FallacyType, type LogicalFallacy } from "@/types/fallacy";

/**
 * The model returns `startIndex` / `endIndex` as free-form numbers, so nothing
 * guarantees they land inside the analysed text. `renderAnnotatedText` builds a
 * `charMap` of exactly `text.length` entries and walks `startIndex -> endIndex`
 * over it, so an out-of-range pair indexes past the array.
 *
 * `charMap[i]?.push(fallacy)` (PR #32) and the `i < textLength` guard are what
 * keep that from throwing. These cases pin both ends:
 *
 *  - a negative `startIndex` is caught only by the optional chain. Rewrite it to
 *    `charMap[i].push(fallacy)` and the first and third cases throw a TypeError
 *    mid-render, so the text never reaches the DOM.
 *  - an `endIndex` past the end is covered by either guard alone: `i < textLength`
 *    or the optional chain. The second case therefore cannot tell them apart
 *    (dropping `i < textLength` leaves all three tests passing, measured on
 *    PR #38). It exists to kill the both-guards-removed mutant, which is the
 *    shape a "simplify the loop" refactor would produce.
 *
 * In every case the whole text has to render, so each case asserts the rendered
 * text is byte-for-byte the input. The span counts pin the other half: dropping
 * an out-of-range fallacy wholesale (one plausible "fix") would leave the first
 * two cases unannotated, and reading a negative index as an offset from the end
 * of the text (another) would annotate the third. Both were run as mutants and
 * both are caught.
 */

const TEXT = "Everyone knows this is true, so it must be true.";

function makeFallacy(overrides: Partial<LogicalFallacy>): LogicalFallacy {
  return {
    type: FallacyType.CircularReasoning,
    description: "Circular reasoning",
    explanation: "The claim is offered as its own evidence.",
    confidence: 0.9,
    startIndex: 0,
    endIndex: 1,
    ...overrides,
  };
}

/** Minimal stand-in for the SSE response the component reads. */
function streamResponse(result: AnalysisResult): Response {
  const chunk = new TextEncoder().encode(`data: ${JSON.stringify(result)}\n\n`);
  let sent = false;

  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () => {
          if (sent) {
            return { done: true, value: undefined };
          }
          sent = true;
          return { done: false, value: chunk };
        },
        cancel: async () => undefined,
        releaseLock: () => undefined,
      }),
    },
  } as unknown as Response;
}

async function renderWithFallacies(fallacies: LogicalFallacy[]) {
  const result: AnalysisResult = {
    text: TEXT,
    fallacies,
    analysisId: "test-analysis",
    timestamp: new Date(0),
    isFinalResult: true,
  };

  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse(result)));

  const onComplete = vi.fn();
  const onError = vi.fn();
  const { container } = render(
    <StreamingAnalysis
      text={TEXT}
      onComplete={onComplete}
      onError={onError}
      abortController={new AbortController()}
    />
  );

  // The component reads the stream over a promise chain and then debounces its
  // state update by 300ms. Driving that on fake timers keeps the test off the
  // wall clock: `advanceTimersByTimeAsync` yields to the microtask queue as it
  // advances, so the fetch chain settles, schedules the debounce, and fires it
  // inside this one call.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });

  // onComplete runs from an effect once the stream is done and a result is in
  // state, so it is the signal that the annotated text has been rendered.
  expect(onComplete).toHaveBeenCalledTimes(1);

  const annotated = container.querySelector(".prose");
  return { annotated, onComplete, onError };
}

describe("StreamingAnalysis out-of-range fallacy indices", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // The component is extremely chatty; keep the suite output readable.
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the whole text when a fallacy starts before index 0", async () => {
    const { annotated, onError } = await renderWithFallacies([
      makeFallacy({ startIndex: -5, endIndex: 8 }),
    ]);

    expect(annotated).not.toBeNull();
    expect(annotated?.textContent).toBe(TEXT);
    // The in-range half of the span is still annotated: the guard skips the
    // characters that do not exist, not the fallacy.
    expect(annotated?.querySelectorAll("span").length).toBeGreaterThan(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("renders the whole text when a fallacy ends past the last index", async () => {
    const { annotated, onError } = await renderWithFallacies([
      makeFallacy({ startIndex: TEXT.length - 5, endIndex: TEXT.length + 40 }),
    ]);

    expect(annotated).not.toBeNull();
    expect(annotated?.textContent).toBe(TEXT);
    expect(annotated?.querySelectorAll("span").length).toBeGreaterThan(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("renders unannotated text when a fallacy is wholly out of range", async () => {
    const { annotated, onError } = await renderWithFallacies([
      makeFallacy({ startIndex: -10, endIndex: -2 }),
    ]);

    expect(annotated).not.toBeNull();
    expect(annotated?.textContent).toBe(TEXT);
    // Nothing was annotated, so the text is one plain segment.
    expect(annotated?.querySelectorAll("span")).toHaveLength(1);
    expect(onError).not.toHaveBeenCalled();
  });
});
