import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useCopyToClipboard } from "../../../src/hooks/use-copy-to-clipboard";

describe("useCopyToClipboard", () => {
  // Mock clipboard API
  const mockWriteText = vi.fn(() => Promise.resolve());
  const mockExecCommand = vi.fn(() => true);
  // jsdom does not implement execCommand, so define it on the real document.
  // Replacing global.document with a spread copy breaks React 19's renderHook,
  // which needs the real document.body.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", { clipboard: { writeText: mockWriteText } });
    Object.defineProperty(document, "execCommand", {
      value: mockExecCommand,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document, "execCommand");
  });

  test("should copy text to clipboard and set isCopied to true", async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      result.current.copyToClipboard("test text");
    });

    expect(mockWriteText).toHaveBeenCalledWith("test text");
    expect(result.current.isCopied).toBe(true);
  });

  test("should reset isCopied after timeout", async () => {
    const { result } = renderHook(() => useCopyToClipboard({ timeout: 1000 }));

    await act(async () => {
      result.current.copyToClipboard("test text");
    });

    expect(result.current.isCopied).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isCopied).toBe(false);
  });

  test("should call onCopy callback when provided", async () => {
    const onCopy = vi.fn();
    const { result } = renderHook(() => useCopyToClipboard({ onCopy }));

    await act(async () => {
      result.current.copyToClipboard("test text");
    });

    expect(onCopy).toHaveBeenCalled();
  });

  test("should not copy empty text", async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      result.current.copyToClipboard("");
    });

    expect(mockWriteText).not.toHaveBeenCalled();
    expect(result.current.isCopied).toBe(false);
  });

  test("should handle missing clipboard API gracefully", async () => {
    // Remove clipboard API but keep document.execCommand for fallback
    vi.stubGlobal("navigator", {});

    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      result.current.copyToClipboard("test text");
    });

    expect(mockExecCommand).toHaveBeenCalledWith("copy");
    expect(result.current.isCopied).toBe(true);
  });
});
