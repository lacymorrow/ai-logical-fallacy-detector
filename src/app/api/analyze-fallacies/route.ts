import { analyzeFallacies, streamAnalyzeFallacies } from "@/server/services/fallacy-detection";
import { cacheService } from "@/server/services/cache-service";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
	text: z.string().min(1).max(5000),
	stream: z.boolean().optional().default(false),
	skipCache: z.boolean().optional().default(false),
});

// Simple in-memory rate limiter
const rateLimits = new Map<
	string,
	{
		count: number;
		resetAt: number;
	}
>();

const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

function checkRateLimit(ip: string): {
	success: boolean;
	limit: number;
	remaining: number;
	reset: number;
} {
	const now = Date.now();
	const userLimit = rateLimits.get(ip);

	// Clean up expired entries
	for (const [key, value] of rateLimits.entries()) {
		if (value.resetAt < now) {
			rateLimits.delete(key);
		}
	}

	if (!userLimit || userLimit.resetAt < now) {
		// First request or reset period
		rateLimits.set(ip, {
			count: 1,
			resetAt: now + RATE_LIMIT_WINDOW,
		});
		return {
			success: true,
			limit: RATE_LIMIT,
			remaining: RATE_LIMIT - 1,
			reset: now + RATE_LIMIT_WINDOW,
		};
	}

	if (userLimit.count >= RATE_LIMIT) {
		return {
			success: false,
			limit: RATE_LIMIT,
			remaining: 0,
			reset: userLimit.resetAt,
		};
	}

	userLimit.count++;
	return {
		success: true,
		limit: RATE_LIMIT,
		remaining: RATE_LIMIT - userLimit.count,
		reset: userLimit.resetAt,
	};
}

export async function POST(request: Request) {
	try {
		// Get request ID if provided
		const requestId = request.headers.get("x-request-id") || `req-${Date.now()}`;
		console.log(`Received analysis request [${requestId}]`);

		// Get IP for rate limiting
		const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
		console.log(`Client IP: ${ip} [${requestId}]`);

		const { success, limit, reset, remaining } = checkRateLimit(ip);
		console.log(`Rate limit check [${requestId}]:`, { success, limit, reset, remaining });

		if (!success) {
			console.log(`Rate limit exceeded for IP: ${ip} [${requestId}]`);
			return NextResponse.json(
				{
					error: "Too many requests",
					limit,
					reset,
					remaining,
				},
				{
					status: 429,
					headers: {
						"X-RateLimit-Limit": limit.toString(),
						"X-RateLimit-Remaining": remaining.toString(),
						"X-RateLimit-Reset": reset.toString(),
						"Cache-Control": "no-store",
					},
				}
			);
		}

		const body = await request.json();
		console.log(`Request body [${requestId}]:`, { ...body, text: body.text.slice(0, 50) + "..." });

		const { text, stream, skipCache } = requestSchema.parse(body);
		console.log(`Parsed request [${requestId}]:`, { stream, skipCache });

		const commonHeaders = {
			"X-RateLimit-Limit": limit.toString(),
			"X-RateLimit-Remaining": remaining.toString(),
			"X-RateLimit-Reset": reset.toString(),
		};

		if (stream) {
			// If caching is allowed, attempt to serve a cached analysis first
			if (!skipCache) {
				const cached = await cacheService.getCachedAnalysis(text);
				if (cached) {
					console.log(`Cache hit – serving cached analysis via SSE [${requestId}]`);
					const encoder = new TextEncoder();
					const cachedStream = new ReadableStream({
						start(controller) {
							// Ensure the payload matches the StreamingAnalysis expectations
							const message = `data: ${JSON.stringify({ ...cached, isFinalResult: true })}\n\n`;
							controller.enqueue(encoder.encode(message));
							controller.close();
						},
					});

					return new Response(cachedStream, {
						headers: {
							"Content-Type": "text/event-stream",
							"Cache-Control": "public, max-age=86400",
							Connection: "keep-alive",
							"X-Accel-Buffering": "no",
							...commonHeaders,
						},
					});
				}
			}

			console.log(`Starting streaming response [${requestId}]`);
			const encoder = new TextEncoder();
			const stream = new ReadableStream({
				async start(controller) {
					try {
						console.log(`Initializing stream controller [${requestId}]`);
						for await (const result of streamAnalyzeFallacies(text)) {
							console.log(`Streaming result [${requestId}]:`, {
								fallaciesCount: result.fallacies.length,
								timestamp: result.timestamp,
								isFinal: result.isFinalResult,
							});
							// Ensure proper SSE formatting with data: prefix and double newlines
							const message = `data: ${JSON.stringify(result)}\n\n`;
							controller.enqueue(encoder.encode(message));
						}
						console.log(`Stream complete, closing controller [${requestId}]`);
						controller.close();
					} catch (error) {
						console.error(`Error in stream controller [${requestId}]:`, error);
						controller.error(error);
					}
				},
			});

			console.log(`Returning streaming response [${requestId}]`);
			return new Response(stream, {
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache, no-transform",
					Connection: "keep-alive",
					"X-Accel-Buffering": "no", // Disable proxy buffering
					...commonHeaders,
				},
			});
		}

		console.log(`Processing non-streaming request [${requestId}]`);
		const result = await analyzeFallacies(text);
		console.log(`Analysis complete [${requestId}]:`, {
			fallaciesCount: result.fallacies.length,
			timestamp: result.timestamp,
		});

		const cacheControl = skipCache ? "no-store" : "public, max-age=86400"; // 24 hours

		return NextResponse.json(result, {
			headers: {
				...commonHeaders,
				"Cache-Control": cacheControl,
				ETag: `"${Buffer.from(text).toString("base64")}"`,
			},
		});
	} catch (error) {
		console.error("Error in fallacy analysis route:", error);
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid request data", details: error.errors },
				{
					status: 400,
					headers: {
						"Cache-Control": "no-store",
					},
				}
			);
		}
		return NextResponse.json(
			{ error: "Failed to analyze text" },
			{
				status: 500,
				headers: {
					"Cache-Control": "no-store",
				},
			}
		);
	}
}
