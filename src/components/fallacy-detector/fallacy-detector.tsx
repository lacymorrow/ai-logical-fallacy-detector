"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { AnalysisResult } from "@/types/fallacy";
import type * as React from "react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { StreamingAnalysis } from "./streaming-analysis";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

export function FallacyDetector() {
	const [text, setText] = useState("");
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [result, setResult] = useState<AnalysisResult | null>(null);
	const [isInputOpen, setIsInputOpen] = useState(true);
	const abortControllerRef = useRef<AbortController | null>(null);
	// Ref to track if we're currently rendering the StreamingAnalysis component
	const isStreamingRef = useRef(false);
	// Use a key to force remount of StreamingAnalysis when needed
	const [streamKey, setStreamKey] = useState(0);
	// Track active toast IDs to prevent duplicates
	const activeToastRef = useRef<string | number | null>(null);

	// Define example texts
	const examples = [
		"Smoking is not bad for you; my grandpa smoked a pack a day and lived to be 90.",
		"If we allow students to use calculators, they'll never learn basic math. Soon, they won't even be able to do simple addition without a machine!",
		"Of course, he's against the new tax plan; he's rich and doesn't want to pay his fair share!",
		"The vast majority of people believe in ghosts, so they must be real.",
	];

	// Minimum text length before we start analyzing
	const MIN_TEXT_LENGTH = 20;

	// Cleanup function for ongoing streams
	const cleanupStream = () => {
		if (abortControllerRef.current) {
			console.log("Aborting previous stream");
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
		isStreamingRef.current = false;

		// Dismiss any active loading toast
		if (activeToastRef.current) {
			toast.dismiss(activeToastRef.current);
			activeToastRef.current = null;
		}
	};

	const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const newText = e.target.value;
		setText(newText);
	};

	const analyzeText = async () => {
		if (!text.trim()) {
			toast.error("Please enter some text to analyze");
			return;
		}

		if (text.length < MIN_TEXT_LENGTH) {
			toast.error(`Text must be at least ${MIN_TEXT_LENGTH} characters long`);
			return;
		}

		// If already analyzing, don't start another analysis
		if (isAnalyzing) {
			toast.info("Analysis already in progress");
			return;
		}

		// If we're already streaming, prevent duplicate starts
		if (isStreamingRef.current) {
			console.log("Already streaming analysis, not starting another");
			toast.info("Analysis already in progress");
			return;
		}

		// Clean up any existing stream before starting a new one
		cleanupStream();

		// Mark that we're now analyzing
		setIsAnalyzing(true);
		setResult(null);
		isStreamingRef.current = true;

		// Create new abort controller for this stream
		abortControllerRef.current = new AbortController();

		// Increment the key to force a remount of the StreamingAnalysis component
		setStreamKey(prevKey => prevKey + 1);

		// Show loading toast and store its ID
		activeToastRef.current = toast.loading("Analyzing text for logical fallacies...");

		console.log("Analysis beginning with new abort controller");
	};

	const handleStreamComplete = useCallback((finalResult: AnalysisResult) => {
		console.log("Stream complete callback received with fallacies:", finalResult.fallacies);

		// Log each fallacy for detailed debugging
		finalResult.fallacies.forEach((fallacy, index) => {
			console.log(`Fallacy ${index + 1}: ${fallacy.type} (${fallacy.confidence.toFixed(2)})`);
		});

		// IMPORTANT: Get the actual fallacy count from the finalResult
		const fallacyCount = finalResult.fallacies.length;
		console.log(`Total fallacies found: ${fallacyCount}`);

		// Update the state with the result
		setResult(finalResult);
		setIsAnalyzing(false);
		isStreamingRef.current = false;

		// Dismiss any active loading toast
		if (activeToastRef.current) {
			toast.dismiss(activeToastRef.current);
		}

		// Show success toast with the correct fallacy count
		activeToastRef.current = toast.success(
			`Analysis complete! Found ${fallacyCount} logical ${fallacyCount === 1 ? 'fallacy' : 'fallacies'}.`
		);

		// Collapse the input section when analysis completes successfully
		setIsInputOpen(false);
	}, []);

	const handleStreamError = useCallback((error: Error) => {
		cleanupStream();
		setIsAnalyzing(false);
		if (error.name !== "AbortError") {
			toast.error(error.message);
		}
	}, []);

	return (
		<div className="mx-auto max-w-4xl space-y-6">
			<Card className="p-6">
				<Collapsible open={isInputOpen} onOpenChange={setIsInputOpen}>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-2xl font-bold">BS Detector</h2>
						{/* Only show the collapse trigger if we have results */}
						{result && (
							<CollapsibleTrigger asChild>
								<Button variant="ghost" size="sm" className="p-0 h-9 w-9">
									{isInputOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
									<span className="sr-only">{isInputOpen ? "Close" : "Open"} input section</span>
								</Button>
							</CollapsibleTrigger>
						)}
					</div>

					<CollapsibleContent className="space-y-4">
						<p className="mb-4 text-sm text-muted-foreground">Find logical fallacies in anything. Try pasting news, speeches, arguments, or anything else.</p>
						<div className="space-y-4">
							<Textarea
								placeholder={`Enter any text to analyze for logical fallacies... (minimum ${MIN_TEXT_LENGTH} characters)`}
								value={text}
								onChange={handleTextChange}
								className="min-h-[200px]"
							/>
							<div className="flex justify-end">
								<Button
									onClick={analyzeText}
									disabled={isAnalyzing || text.length < MIN_TEXT_LENGTH}
									className="min-w-[120px]"
								>
									{isAnalyzing ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" /> Analyzing...</span> : "Analyze Text"}
								</Button>
							</div>
						</div>

						<div className="mt-4 border-t pt-4">
							<h3 className="mb-2 text-lg font-semibold">Try an example:</h3>
							<div className="flex flex-wrap gap-2">
								{examples.map((example, index) => (
									<Button
										key={index}
										variant="outline"
										size="sm"
										onClick={() => {
											setText(example);
											analyzeText();
										}}
										disabled={isAnalyzing}
									>
										{example.substring(0, 30)}...
									</Button>
								))}
							</div>
						</div>
					</CollapsibleContent>
				</Collapsible>
			</Card>

			{(isAnalyzing || result) && (
				<Card className="p-6">
					<h3 className="mb-4 text-xl font-semibold">Analysis Results</h3>
					{/* Only render StreamingAnalysis if we're actually analyzing or have results */}
					{(isAnalyzing || result) && (
						<StreamingAnalysis
							key={streamKey}
							text={text}
							onComplete={handleStreamComplete}
							onError={handleStreamError}
							abortController={abortControllerRef.current}
						/>
					)}
				</Card>
			)}
		</div>
	);
}
