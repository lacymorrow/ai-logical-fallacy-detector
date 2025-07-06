import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeFallacies } from "../fallacy-detection";
import { FallacyType } from "@/types/fallacy";
import OpenAI from "openai";

const mockCreate = vi.fn().mockResolvedValue({
  id: "mock-completion-id",
  choices: [
    {
      message: {
        content: JSON.stringify({
          fallacies: [
            {
              type: "AD_HOMINEM",
              description: "Personal attack instead of addressing the argument",
              startIndex: 10,
              endIndex: 30,
              explanation: "The speaker attacks the person rather than their argument",
              confidence: 0.9,
            },
          ],
        }),
      },
    },
  ],
});

vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

describe("Fallacy Detection Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should analyze text and detect fallacies", async () => {
    const text = "You're wrong because you're not an expert in this field.";
    const result = await analyzeFallacies(text);

    expect(result).toEqual({
      text,
      fallacies: [
        {
          type: FallacyType.AdHominem,
          description: "Personal attack instead of addressing the argument",
          startIndex: 10,
          endIndex: 30,
          explanation: "The speaker attacks the person rather than their argument",
          confidence: 0.9,
        },
      ],
      analysisId: "mock-completion-id",
      timestamp: expect.any(Date),
    });
  });

  it("should handle empty response from OpenAI", async () => {
    mockCreate.mockResolvedValueOnce({
      id: "mock-completion-id",
      choices: [{ message: { content: "{}" } }],
    });

    const text = "This is a valid argument.";
    const result = await analyzeFallacies(text);

    expect(result).toEqual({
      text,
      fallacies: [],
      analysisId: "mock-completion-id",
      timestamp: expect.any(Date),
    });
  });

  it("should handle API errors gracefully", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API Error"));

    const text = "Test text";
    await expect(analyzeFallacies(text)).rejects.toThrow(
      "Failed to analyze text for logical fallacies"
    );
  });
});
