import { env } from "@/env";
import type { AnalysisResult, FallacyType, LogicalFallacy } from "@/types/fallacy";
import OpenAI from "openai";
import { cacheService } from "./cache-service";

const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a precise logical fallacy detection system. Your task is to analyze text and identify logical fallacies with high accuracy.

FALLACY TYPES AND CRITERIA:
- AD_HOMINEM: Attack on the person rather than their argument
- STRAW_MAN: Misrepresenting an opponent's position
- FALSE_EQUIVALENCE: Invalid comparison between different things
- APPEAL_TO_AUTHORITY: Using authority as proof without merit
- SLIPPERY_SLOPE: Claiming one event leads to extreme consequences
- FALSE_DICHOTOMY: Presenting only two options when more exist
- CIRCULAR_REASONING: Using conclusion to prove premises
- HASTY_GENERALIZATION: Drawing conclusions from insufficient evidence
- APPEAL_TO_EMOTION: Using emotions instead of logic
- RED_HERRING: Introducing irrelevant information to distract

CONFIDENCE SCORING GUIDELINES:
- 0.9-1.0: Clear, unambiguous examples with all criteria met
- 0.7-0.8: Strong examples with most criteria met
- 0.5-0.6: Moderate examples with some ambiguity
- 0.3-0.4: Weak examples with significant uncertainty
- <0.3: Do not report, insufficient confidence

ANALYSIS RULES:
1. Focus on clear, demonstrable fallacies
2. Provide exact text spans with correct indices
3. Give concise, specific explanations
4. Use consistent confidence scoring
5. Emit complete fallacy objects one at a time
6. Sort fallacies by confidence (highest first)

For streaming mode, emit each fallacy as a complete JSON object immediately upon identification, formatted as:
{
  "fallacy": {
    "type": "FALLACY_TYPE",
    "description": "Brief, specific description",
    "startIndex": exact_start,
    "endIndex": exact_end,
    "explanation": "Clear explanation referencing the specific text",
    "confidence": carefully_scored_value
  }
}

For non-streaming mode, return a complete analysis with all fallacies sorted by confidence.`;

export async function analyzeFallacies(text: string): Promise<AnalysisResult> {
	try {
		console.log(`Starting fallacy analysis for text: ${text.slice(0, 50)}...`);

		// Check cache first
		console.log("Checking cache");
		const cached = await cacheService.getCachedAnalysis(text);
		if (cached) {
			console.log("Cache hit, returning cached result");
			return cached;
		}
		console.log("Cache miss, performing analysis");

		const completion = await openai.chat.completions.create({
			model: "gpt-4-turbo-preview",
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{
					role: "user",
					content: `Analyze this text for logical fallacies: "${text}"

Expected response format:
{
  "fallacies": [
    {
      "type": "FallacyType (e.g., AD_HOMINEM)",
      "description": "Brief description of the fallacy",
      "startIndex": number,
      "endIndex": number,
      "explanation": "Detailed explanation of why this is a fallacy",
      "confidence": number (0-1)
    }
  ]
}`,
				},
			],
			response_format: { type: "json_object" },
		});

		console.log("Received OpenAI response:", completion.id);
		const result = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
		console.log("Parsed OpenAI response:", {
			fallaciesCount: result.fallacies?.length ?? 0,
		});

		const analysisResult = {
			text,
			fallacies: result.fallacies.map((f: any) => ({
				...f,
				type: f.type as FallacyType,
			})),
			analysisId: completion.id,
			timestamp: new Date(),
		};

		// Cache the result
		console.log("Caching analysis result");
		await cacheService.cacheAnalysis(text, analysisResult);

		return analysisResult;
	} catch (error) {
		console.error("Error analyzing fallacies:", error);
		throw new Error("Failed to analyze text for logical fallacies");
	}
}

export async function* streamAnalyzeFallacies(
	text: string
): AsyncGenerator<AnalysisResult, void, unknown> {
	console.log(`Starting streaming analysis for text: ${text.slice(0, 50)}...`);
	try {
		console.log("Starting streaming fallacy analysis");
		const stream = await openai.chat.completions.create({
			model: "gpt-4-turbo-preview",
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{
					role: "user",
					content: `Analyze this text for logical fallacies: "${text}"

Please emit each fallacy as a complete JSON object as soon as you identify it.
Format each fallacy as:
{
  "fallacy": {
    "type": "FallacyType",
    "description": "Brief description",
    "startIndex": number,
    "endIndex": number,
    "explanation": "Detailed explanation",
    "confidence": number
  }
}`,
				},
			],
			stream: true,
		});

		console.log("OpenAI stream created");
		let buffer = "";
		let currentFallacies: LogicalFallacy[] = [];
		// Track fallacies we've already yielded by their start/end indices
		const processedFallacyKeys = new Set<string>();

		// Batch updates to reduce UI flickering
		let pendingFallacies: LogicalFallacy[] = [];
		let lastYieldTime = Date.now();
		const BATCH_INTERVAL = 1000; // Only yield updates once per second

		for await (const chunk of stream) {
			const content = chunk.choices[0]?.delta?.content || "";
			if (!content) continue;

			buffer += content;

			try {
				// Try to parse complete fallacy objects
				const matches = buffer.match(/\{(?:[^{}]|"[^"]*"|\{[^{}]*\})*\}/g);
				if (matches) {
					for (const match of matches) {
						try {
							const fallacyObj = JSON.parse(match);
							if (fallacyObj.fallacy) {
								const newFallacy = {
									...fallacyObj.fallacy,
									type: fallacyObj.fallacy.type as FallacyType,
								};

								// Create a unique key for this fallacy
								const fallacyKey = `${newFallacy.type}-${newFallacy.startIndex}-${newFallacy.endIndex}`;

								// Only add if we haven't seen this fallacy before
								if (!processedFallacyKeys.has(fallacyKey)) {
									processedFallacyKeys.add(fallacyKey);
									currentFallacies = [...currentFallacies, newFallacy];
									pendingFallacies.push(newFallacy);

									// Remove the processed fallacy from the buffer
									buffer = buffer.replace(match, "");
								} else {
									// Still remove the processed fallacy from the buffer
									buffer = buffer.replace(match, "");
								}
							}
						} catch (e) {
							// Skip invalid JSON objects
						}
					}
				}

				// Only yield updates at most once per second if we have new fallacies
				const now = Date.now();
				if (pendingFallacies.length > 0 && now - lastYieldTime >= BATCH_INTERVAL) {
					// Sort fallacies by confidence (highest first)
					currentFallacies.sort((a, b) => b.confidence - a.confidence);

					// Yield current state (not final)
					const result: AnalysisResult = {
						text,
						fallacies: currentFallacies,
						analysisId: chunk.id,
						timestamp: new Date(),
						isFinalResult: false,
					};

					console.log(
						`Yielding batch of ${pendingFallacies.length} new fallacies, total: ${currentFallacies.length}`
					);
					yield result;

					// Reset pending fallacies and update last yield time
					pendingFallacies = [];
					lastYieldTime = now;
				}
			} catch (e) {
				// Continue accumulating if we don't have valid JSON yet
			}
		}

		// Always yield a final result so that clients can complete the stream gracefully
		console.log("Stream complete, preparing final result");

		// Sort fallacies by confidence (highest first)
		currentFallacies.sort((a, b) => b.confidence - a.confidence);

		const finalResult: AnalysisResult = {
			text,
			fallacies: currentFallacies,
			analysisId: "final",
			timestamp: new Date(),
			isFinalResult: true,
		};

		console.log(`Final result prepared with ${currentFallacies.length} fallacies`);
		// Cache the analysis result for future non-skipCache requests
		try {
			await cacheService.cacheAnalysis(text, finalResult);
			console.log("Final result cached");
		} catch (cacheError) {
			console.error("Failed to cache final streaming result", cacheError);
		}

		// Yield the final result to the client
		yield finalResult;
	} catch (error) {
		console.error("Error streaming fallacy analysis:", error);
		throw new Error("Failed to stream fallacy analysis");
	}
}
