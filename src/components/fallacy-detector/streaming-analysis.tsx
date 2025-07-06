"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AnalysisResult, LogicalFallacy } from "@/types/fallacy";
import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface StreamingAnalysisProps {
	text: string;
	onComplete: (result: AnalysisResult) => void;
	onError: (error: Error) => void;
	abortController: AbortController | null;
}

interface FallacyAnnotationProps {
	fallacy: LogicalFallacy;
	text: React.ReactNode;
	isHovered: boolean;
	onHover: (fallacy: LogicalFallacy | null) => void;
	onToggleSticky: (f: LogicalFallacy) => void;
	isNew?: boolean;
}

// Utility function to get fallacy color with specified opacity
const getFallacyColor = (fallacy: LogicalFallacy, opacity: number) => {
	const opacityStr = opacity.toString();
	switch (fallacy.type) {
		case "AD_HOMINEM": return `rgba(239, 68, 68, ${opacityStr})`; // red-500
		case "STRAW_MAN": return `rgba(249, 115, 22, ${opacityStr})`; // orange-500
		case "FALSE_EQUIVALENCE": return `rgba(234, 179, 8, ${opacityStr})`; // yellow-500
		case "APPEAL_TO_AUTHORITY": return `rgba(132, 204, 22, ${opacityStr})`; // lime-500
		case "SLIPPERY_SLOPE": return `rgba(16, 185, 129, ${opacityStr})`; // emerald-500
		case "FALSE_DICHOTOMY": return `rgba(6, 182, 212, ${opacityStr})`; // cyan-500
		case "CIRCULAR_REASONING": return `rgba(59, 130, 246, ${opacityStr})`; // blue-500
		case "HASTY_GENERALIZATION": return `rgba(99, 102, 241, ${opacityStr})`; // indigo-500
		case "APPEAL_TO_EMOTION": return `rgba(168, 85, 247, ${opacityStr})`; // purple-500
		case "RED_HERRING": return `rgba(236, 72, 153, ${opacityStr})`; // pink-500
		default:
			if (fallacy.confidence > 0.8) return `rgba(239, 68, 68, ${opacityStr})`; // red-500
			if (fallacy.confidence > 0.6) return `rgba(249, 115, 22, ${opacityStr})`; // orange-500
			return `rgba(234, 179, 8, ${opacityStr})`; // yellow-500
	}
};

const FallacyAnnotation = ({ fallacy, text, isHovered, onHover, onToggleSticky, isNew = false }: FallacyAnnotationProps) => {
	// Create the underline style using background gradient
	const underlineStyle = {
		background: `
			linear-gradient(
				to right,
				transparent,
				transparent 50%,
				${getFallacyColor(fallacy, 0.5)} 50%,
				${getFallacyColor(fallacy, 0.5)} 100%
			)`,
		backgroundSize: "6px 2px",
		backgroundPosition: "0 calc(100% - 0.1em)",
		backgroundRepeat: "repeat-x",
		paddingBottom: "3px",
	};

	// Get a lighter version of the fallacy color for the background highlight
	const getHighlightColor = () => {
		return getFallacyColor(fallacy, 0.15);
	};

	return (
		<motion.span
			initial={isNew ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			style={{
				...underlineStyle,
				backgroundColor: isHovered ? getHighlightColor() : undefined,
			}}
			className={cn(
				"relative cursor-pointer transition-colors duration-200",
				!isHovered && "hover:bg-opacity-10"
			)}
			onMouseEnter={() => onHover(fallacy)}
			onMouseLeave={() => onHover(null)}
			onClick={(e) => {
				e.stopPropagation();
				onToggleSticky(fallacy);
			}}
		>
			{text}
			<AnimatePresence>
				{isHovered && (
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						transition={{ duration: 0.05 }}
						className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800"
					>
						<div
							className="mb-2 font-semibold flex items-center"
							style={{ color: getFallacyColor(fallacy, 1) }}
						>
							<span className="inline-block w-3 h-3 mr-2 rounded-full" style={{ backgroundColor: getFallacyColor(fallacy, 1) }} />
							{fallacy.type.replace(/_/g, " ")}
						</div>
						<p className="text-sm font-medium mb-2">{fallacy.description}</p>
						<p className="text-sm text-gray-600 dark:text-gray-300">{fallacy.explanation}</p>
						<div className="mt-2">
							<div className="text-xs text-gray-500 dark:text-gray-400">Confidence</div>
							<div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20 mt-1">
								<div
									className="h-full flex-1 transition-all"
									style={{
										width: `${fallacy.confidence * 100}%`,
										backgroundColor: getFallacyColor(fallacy, 1)
									}}
								/>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.span>
	);
};

export function StreamingAnalysis({
	text,
	onComplete,
	onError,
	abortController,
}: StreamingAnalysisProps) {
	const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
	const [hoveredFallacy, setHoveredFallacy] = useState<LogicalFallacy | null>(null);
	const [stickiedFallacy, setStickiedFallacy] = useState<LogicalFallacy | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [streamComplete, setStreamComplete] = useState(false);
	// Add a unique ID to this component instance to help debug
	const instanceId = useRef(`stream-${Date.now()}`);
	// Track if we've already started the analysis to prevent duplicate streams
	const hasStartedAnalysisRef = useRef(false);
	// Store the current abort controller
	const abortControllerRef = useRef<AbortController | null>(null);
	// Track if we've already called onComplete to prevent duplicate calls
	const hasCalledCompleteRef = useRef(false);

	// Track previously seen fallacies to determine which ones are new
	const previousFallaciesRef = useRef<Map<string, LogicalFallacy>>(new Map());

	// Debounce timer for UI updates
	const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Debounced update function to reduce UI flickering
	const debouncedSetResult = useCallback((result: AnalysisResult) => {
		if (updateTimerRef.current) {
			clearTimeout(updateTimerRef.current);
		}

		updateTimerRef.current = setTimeout(() => {
			setCurrentResult(result);
			setIsLoading(false);

			// Update our reference of seen fallacies
			const fallacyMap = new Map(previousFallaciesRef.current);
			for (const fallacy of result.fallacies) {
				const key = `${fallacy.type}-${fallacy.startIndex}-${fallacy.endIndex}`;
				fallacyMap.set(key, fallacy);
			}
			previousFallaciesRef.current = fallacyMap;

			updateTimerRef.current = null;
		}, 300); // 300ms debounce
	}, []);

	// Safe wrapper for onComplete to prevent duplicate calls
	const safelyCallOnComplete = useCallback((result: AnalysisResult) => {
		if (!hasCalledCompleteRef.current) {
			console.log(`[${instanceId.current}] Calling onComplete for the first time`);
			hasCalledCompleteRef.current = true;
			onComplete(result);
		} else {
			console.log(`[${instanceId.current}] Skipping duplicate onComplete call`);
		}
	}, [onComplete, instanceId]);

	// Effect to handle completion only when stream is done
	useEffect(() => {
		if (streamComplete && currentResult && !hasCalledCompleteRef.current) {
			console.log(`[${instanceId.current}] Stream complete, calling onComplete with final result`);
			console.log(`[${instanceId.current}] Final result has ${currentResult.fallacies.length} fallacies`);

			// Log detailed information about each fallacy in the final result
			currentResult.fallacies.forEach((fallacy, index) => {
				console.log(`[${instanceId.current}] Fallacy #${index + 1}: ${fallacy.type}`);
			});

			// Pass the complete, unmodified currentResult to onComplete
			safelyCallOnComplete(currentResult);
		}
	}, [streamComplete, currentResult, safelyCallOnComplete, instanceId]);

	// Effect to start analysis when abortController changes
	useEffect(() => {
		// Update our reference to the current abort controller
		abortControllerRef.current = abortController;

		// Only start analysis if we have an abort controller and haven't started yet
		if (abortController && !hasStartedAnalysisRef.current) {
			console.log(`[${instanceId.current}] Starting analysis with new abort controller`);
			hasStartedAnalysisRef.current = true;
			// Reset the fallacies map when starting a new analysis
			previousFallaciesRef.current = new Map();
			// Reset the completion flag when starting a new analysis
			hasCalledCompleteRef.current = false;

			// Start the fetch stream
			fetchStream();
		} else if (abortController && hasStartedAnalysisRef.current) {
			console.log(`[${instanceId.current}] Not starting analysis - already started with this controller`);
		} else {
			console.log(`[${instanceId.current}] No abort controller provided - not starting analysis`);
		}

		// Cleanup function for when the component unmounts or effect is cleaned up
		return () => {
			console.log(`[${instanceId.current}] StreamingAnalysis effect cleanup`);
			if (updateTimerRef.current) {
				clearTimeout(updateTimerRef.current);
				updateTimerRef.current = null;
			}

			// Don't reset hasStartedAnalysisRef here to prevent duplicate streams
		};
	}, [abortController, instanceId, safelyCallOnComplete]);

	const fetchStream = async () => {
		console.log(`[${instanceId.current}] Starting stream analysis for text: ${text.slice(0, 50)}...`);

		// Generate a unique request ID for tracking duplicates
		const requestId = `${instanceId.current}-${Date.now()}`;
		console.log(`[${instanceId.current}] Request ID: ${requestId}`);

		try {
			console.log(`[${instanceId.current}] Making fetch request to analyze-fallacies endpoint`);
			const response = await fetch("/api/analyze-fallacies", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Request-ID": requestId,
				},
				body: JSON.stringify({ text, stream: true }),
				signal: abortControllerRef.current?.signal,
			});

			if (!response.ok) {
				console.error(`[${instanceId.current}] Stream request failed:`, response.status, response.statusText);
				throw new Error("Failed to start analysis stream");
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error("Failed to create stream reader");
			}

			const decoder = new TextDecoder();
			let buffer = "";

			console.log(`[${instanceId.current}] Starting stream reading loop`);
			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					console.log(`[${instanceId.current}] Stream reading complete`);
					break;
				}

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						try {
							const jsonStr = line.slice(6).trim();
							if (jsonStr) {
								console.log(`[${instanceId.current}] Processing data line: ${jsonStr.substring(0, 30)}...`);
								const data = JSON.parse(jsonStr);
								console.log(`[${instanceId.current}] Parsed stream data with ${data.fallacies?.length || 0} fallacies`);

								// Use debounced update to reduce UI flickering
								debouncedSetResult(data);

								// If this is marked as the final result, set streamComplete
								if (data.isFinalResult) {
									console.log(`[${instanceId.current}] Received final result marker`);
									setStreamComplete(true);
								}
							}
						} catch (e) {
							console.error(`[${instanceId.current}] Error parsing stream data:`, e);
						}
					}
				}
			}

			// Process any remaining data in the buffer
			if (buffer.startsWith("data: ")) {
				try {
					const jsonStr = buffer.slice(6).trim();
					if (jsonStr) {
						const data = JSON.parse(jsonStr);
						debouncedSetResult(data);

						// If this is the final chunk and marked as final result, set streamComplete
						if (data.isFinalResult) {
							setStreamComplete(true);
						}
					}
				} catch (e) {
					console.error(`[${instanceId.current}] Error parsing final buffer:`, e);
				}
			}

			// Mark the stream as complete - onComplete will be called via the effect
			setStreamComplete(true);
		} catch (error: unknown) {
			if (error instanceof Error && error.name === "AbortError") {
				console.log(`[${instanceId.current}] Stream request aborted`);
				// Don't call the error handler for aborted requests
				return;
			}
			console.error(`[${instanceId.current}] Error in streaming analysis:`, error);
			onError(error instanceof Error ? error : new Error("Failed to analyze text"));
		} finally {
			console.log(`[${instanceId.current}] Stream analysis complete`);
			setIsLoading(false);

			// Reset hasStartedAnalysisRef only if this wasn't aborted
			// This prevents a new analysis from starting automatically if component rerenders
			if (!abortControllerRef.current?.signal.aborted) {
				hasStartedAnalysisRef.current = false;
			}
		}
	};

	const renderAnnotatedText = () => {
		if (!currentResult) {
			return (
				<div className="text-gray-600 dark:text-gray-300">
					{isLoading ? "Analyzing text..." : "No fallacies found yet."}
				</div>
			);
		}

		// Helper function to render text with preserved formatting
		const renderFormattedText = (text: string) => {
			return text.split("\n").map((line, i, arr) => (
				<React.Fragment key={`line-${line.substring(0, 10)}-${i}`}>
					{line}
					{i < arr.length - 1 && <br />}
				</React.Fragment>
			));
		};

		// If no fallacies, just render the text
		if (currentResult.fallacies.length === 0) {
			return <div className="whitespace-pre-wrap">{renderFormattedText(currentResult.text)}</div>;
		}

		// Create a character map to track which fallacies apply to each character
		const textLength = currentResult.text.length;
		const charMap: LogicalFallacy[][] = Array(textLength).fill(null).map(() => []);

		// Populate the character map with fallacies
		for (const fallacy of currentResult.fallacies) {
			for (let i = fallacy.startIndex; i < fallacy.endIndex; i++) {
				if (i < textLength) {
					charMap[i].push(fallacy);
				}
			}
		}

		// Group consecutive characters with the same fallacies
		const segments: { text: string; fallacies: LogicalFallacy[] }[] = [];
		let currentSegment: { text: string; fallacies: LogicalFallacy[] } | null = null;

		for (let i = 0; i < textLength; i++) {
			const char = currentResult.text[i];
			const fallaciesAtChar = charMap[i];

			// Check if we need to start a new segment
			const needNewSegment = !currentSegment ||
				!arraysHaveSameFallacies(currentSegment.fallacies, fallaciesAtChar);

			if (needNewSegment) {
				if (currentSegment) {
					segments.push(currentSegment);
				}
				currentSegment = { text: char, fallacies: [...fallaciesAtChar] };
			} else if (currentSegment) {
				currentSegment.text += char;
			}
		}

		// Add the last segment
		if (currentSegment) {
			segments.push(currentSegment);
		}

		// Helper function to check if two arrays have the same fallacies
		function arraysHaveSameFallacies(arr1: LogicalFallacy[], arr2: LogicalFallacy[]): boolean {
			if (arr1.length !== arr2.length) return false;

			// Create sets of fallacy IDs for comparison
			const set1 = new Set(arr1.map(f => `${f.type}-${f.startIndex}-${f.endIndex}`));
			const set2 = new Set(arr2.map(f => `${f.type}-${f.startIndex}-${f.endIndex}`));

			// Check if every item in set1 is in set2
			for (const item of set1) {
				if (!set2.has(item)) return false;
			}

			return true;
		}

		// Render each segment
		return (
			<div className="whitespace-pre-wrap">
				{segments.map((segment, index) => {
					// Generate a more unique key for each segment
					const segmentKey = `segment-${index}-${segment.text.substring(0, 5)}-${segment.fallacies.length}`;

					if (segment.fallacies.length === 0) {
						// Regular text without fallacies
						return (
							<span key={segmentKey}>
								{renderFormattedText(segment.text)}
							</span>
						);
					}

					if (segment.fallacies.length === 1) {
						// Text with a single fallacy
						const fallacy = segment.fallacies[0];
						// Check if this fallacy is new
						const fallacyKey = `${fallacy.type}-${fallacy.startIndex}-${fallacy.endIndex}`;
						const isNewFallacy = !previousFallaciesRef.current.has(fallacyKey);

						return (
							<FallacyAnnotation
								key={segmentKey}
								fallacy={fallacy}
								text={renderFormattedText(segment.text)}
								isHovered={hoveredFallacy === fallacy || stickiedFallacy === fallacy}
								onHover={setHoveredFallacy}
								onToggleSticky={toggleStickyFallacy}
								isNew={isNewFallacy}
							/>
						);
					}

					// Text with multiple fallacies - create a custom multi-fallacy annotation
					return (
						<MultipleAnnotation
							key={segmentKey}
							fallacies={segment.fallacies}
							text={renderFormattedText(segment.text)}
							hoveredFallacy={hoveredFallacy}
							stickiedFallacy={stickiedFallacy}
							onHover={setHoveredFallacy}
							onToggleSticky={toggleStickyFallacy}
						/>
					);
				})}
			</div>
		);
	};

	// Component to handle text with multiple fallacies
	const MultipleAnnotation = ({
		fallacies,
		text,
		hoveredFallacy,
		stickiedFallacy,
		onHover,
		onToggleSticky
	}: {
		fallacies: LogicalFallacy[];
		text: React.ReactNode;
		hoveredFallacy: LogicalFallacy | null;
		stickiedFallacy: LogicalFallacy | null;
		onHover: (fallacy: LogicalFallacy | null) => void;
		onToggleSticky: (f: LogicalFallacy) => void;
	}) => {
		// Sort fallacies by confidence (highest first) to prioritize display
		const sortedFallacies = [...fallacies].sort((a, b) => b.confidence - a.confidence);
		const primaryFallacy = sortedFallacies[0]; // Use the highest confidence fallacy for primary styling
		const isHovered = fallacies.includes(hoveredFallacy as LogicalFallacy) || fallacies.includes(stickiedFallacy as LogicalFallacy);
		const hoveredFallacyInGroup = fallacies.find(f => f === hoveredFallacy);

		// Create a dashed border style to indicate multiple fallacies
		const multipleStyle = {
			background: `
				linear-gradient(
					to right,
					transparent,
					transparent 50%,
					${getFallacyColor(primaryFallacy, 0.5)} 50%,
					${getFallacyColor(primaryFallacy, 0.5)} 100%
				)`,
			backgroundSize: "6px 2px",
			backgroundPosition: "0 calc(100% - 0.1em)",
			backgroundRepeat: "repeat-x",
			paddingBottom: "3px",
			// Add a subtle dotted border to indicate multiple fallacies
			border: "1px dotted rgba(0,0,0,0.2)",
			borderRadius: "2px",
			padding: "0 2px",
		};

		// Get highlight color for hover state
		const getHighlightColor = () => {
			const fallacy = hoveredFallacyInGroup || primaryFallacy;
			return getFallacyColor(fallacy, 0.15);
		};

		return (
			<motion.span
				style={{
					...multipleStyle,
					backgroundColor: isHovered ? getHighlightColor() : undefined,
				}}
				className={cn(
					"relative cursor-pointer transition-colors duration-200",
					!isHovered && "hover:bg-opacity-10"
				)}
				onMouseEnter={() => onHover(primaryFallacy)}
				onMouseLeave={() => onHover(null)}
				onClick={(e) => {
					e.stopPropagation();
					onToggleSticky(primaryFallacy);
				}}
			>
				{text}
				<span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-xs font-bold dark:bg-gray-700">
					{fallacies.length}
				</span>

				<AnimatePresence>
					{isHovered && (
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							transition={{ duration: 0.05 }}
							className="absolute bottom-full left-0 z-60 mb-2 w-72 rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800"
						>
							<h4 className="mb-2 font-semibold">Multiple Fallacies ({fallacies.length})</h4>
							<div className="max-h-60 overflow-y-auto">
								{sortedFallacies.map((fallacy, idx) => (
									<div
										key={`${fallacy.type}-${fallacy.startIndex}-${idx}`}
										className={cn(
											"mb-3 rounded p-2 transition-colors",
											hoveredFallacyInGroup === fallacy ? "bg-gray-100 dark:bg-gray-700" : ""
										)}
										onMouseEnter={() => onHover(fallacy)}
										onMouseLeave={() => onHover(primaryFallacy)}
										onClick={(e) => {
											e.stopPropagation();
											onToggleSticky(fallacy);
										}}
									>
										<div
											className="mb-1 font-semibold flex items-center text-sm"
											style={{ color: getFallacyColor(fallacy, 1) }}
										>
											<span
												className="inline-block w-3 h-3 mr-2 rounded-full"
												style={{ backgroundColor: getFallacyColor(fallacy, 1) }}
											/>
											{fallacy.type.replace(/_/g, " ")}
										</div>
										<p className="text-xs mb-1">{fallacy.description}</p>
										<div className="mt-1">
											<div className="text-xs text-gray-500 dark:text-gray-400">Confidence</div>
											<div className="relative h-1 w-full overflow-hidden rounded-full bg-primary/20 mt-1">
												<div
													className="h-full flex-1 transition-all"
													style={{
														width: `${fallacy.confidence * 100}%`,
														backgroundColor: getFallacyColor(fallacy, 1)
													}}
												/>
											</div>
										</div>
									</div>
								))}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.span>
		);
	};

	// Component-local helper to toggle the sticky fallacy tooltip
	const toggleStickyFallacy = useCallback((fallacy: LogicalFallacy) => {
		setStickiedFallacy(prev => {
			if (prev && prev.type === fallacy.type && prev.startIndex === fallacy.startIndex && prev.endIndex === fallacy.endIndex) {
				return null; // clicking again un-sticks it
			}
			return fallacy;
		});
	}, []);

	return (
		<div className="space-y-4">
			<div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
				{isLoading ? (
					<div className="space-y-2">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-4 w-1/2" />
						<Skeleton className="h-4 w-2/3" />
					</div>
				) : (
					<div className="prose dark:prose-invert">
						{renderAnnotatedText()}
					</div>
				)}
			</div>

			{currentResult && currentResult.fallacies.length > 0 && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="text-sm text-gray-600 dark:text-gray-300"
				>
					Found {currentResult.fallacies.length} logical {currentResult.fallacies.length === 1 ? 'fallacy' : 'fallacies'}
					{currentResult.fallacies.length > 0 && " (hover to see details)"}
				</motion.div>
			)}
		</div>
	);
}
