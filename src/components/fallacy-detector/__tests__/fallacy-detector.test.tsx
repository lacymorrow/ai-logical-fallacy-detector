import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FallacyDetector } from "../fallacy-detector";
import { FallacyType } from "@/types/fallacy";
import { toast } from "sonner";

// Mock the toast module
vi.mock("sonner", () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
        loading: vi.fn(),
    },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("FallacyDetector", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the component", () => {
        render(<FallacyDetector />);
        expect(screen.getByText("Logical Fallacy Detector")).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText("Enter text to analyze for logical fallacies...")
        ).toBeInTheDocument();
        expect(screen.getByText("Analyze Text")).toBeInTheDocument();
    });

    it("handles empty text submission", async () => {
        render(<FallacyDetector />);
        const button = screen.getByText("Analyze Text");
        fireEvent.click(button);

        expect(toast.error).toHaveBeenCalledWith("Please enter some text to analyze");
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it("successfully analyzes text", async () => {
        const mockResponse = {
            text: "Test argument",
            fallacies: [
                {
                    type: FallacyType.AdHominem,
                    description: "Personal attack",
                    startIndex: 0,
                    endIndex: 10,
                    explanation: "Attacks the person instead of the argument",
                    confidence: 0.9,
                },
            ],
            analysisId: "test-id",
            timestamp: new Date().toISOString(),
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse),
        });

        render(<FallacyDetector />);

        const input = screen.getByPlaceholderText(
            "Enter text to analyze for logical fallacies..."
        );
        fireEvent.change(input, { target: { value: "Test argument" } });

        const button = screen.getByText("Analyze Text");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText("Analysis Results")).toBeInTheDocument();
            expect(screen.getByText("Found 1 logical fallacies in the text.")).toBeInTheDocument();
            expect(screen.getByText("Personal attack")).toBeInTheDocument();
        });

        expect(toast.success).toHaveBeenCalledWith(
            "Analysis complete! Found 1 logical fallacies.",
            expect.any(Object)
        );
    });

    it("handles API errors", async () => {
        mockFetch.mockRejectedValueOnce(new Error("API Error"));

        render(<FallacyDetector />);

        const input = screen.getByPlaceholderText(
            "Enter text to analyze for logical fallacies..."
        );
        fireEvent.change(input, { target: { value: "Test argument" } });

        const button = screen.getByText("Analyze Text");
        fireEvent.click(button);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "Failed to analyze text",
                expect.any(Object)
            );
        });
    });

    it("handles rate limit errors", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 429,
            json: () => Promise.resolve({
                error: "Too many requests",
                reset: Date.now() + 60000,
            }),
        });

        render(<FallacyDetector />);

        const input = screen.getByPlaceholderText(
            "Enter text to analyze for logical fallacies..."
        );
        fireEvent.change(input, { target: { value: "Test argument" } });

        const button = screen.getByText("Analyze Text");
        fireEvent.click(button);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                expect.stringContaining("Rate limit exceeded"),
                expect.any(Object)
            );
        });
    });
});
