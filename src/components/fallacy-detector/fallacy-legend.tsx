"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

// Utility function to get fallacy color with specified opacity
const getFallacyColor = (fallacyType: string, opacity: number) => {
	const opacityStr = opacity.toString();
	switch (fallacyType) {
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
			return `rgba(107, 114, 128, ${opacityStr})`; // gray-500
	}
};

export function FallacyLegend() {
	// State to track if the legend is expanded
	const [isExpanded, setIsExpanded] = useState(true);

	// State to track which fallacy is being hovered
	const [hoveredFallacy, setHoveredFallacy] = useState<string | null>(null);
	// State to track a stickied fallacy tooltip (toggle on click)
	const [stickiedFallacy, setStickiedFallacy] = useState<string | null>(null);

	// Define all fallacy types with descriptions
	const fallacyDefinitions = [
		{
			type: "AD_HOMINEM",
			description: "Attack on the person rather than their argument",
			explanation: "This fallacy occurs when someone attacks the character, motive, or other attribute of the person making an argument, rather than addressing the substance of the argument itself."
		},
		{
			type: "STRAW_MAN",
			description: "Misrepresenting an opponent's position",
			explanation: "This fallacy involves giving the impression of refuting an opponent's argument, while actually refuting an argument that was not presented by that opponent."
		},
		{
			type: "FALSE_EQUIVALENCE",
			description: "Invalid comparison between different things",
			explanation: "This fallacy occurs when someone compares two things that aren't really comparable, suggesting they are similar in ways they are not."
		},
		{
			type: "APPEAL_TO_AUTHORITY",
			description: "Using authority as proof without merit",
			explanation: "This fallacy occurs when someone claims something is true because an authority says it is, without providing evidence or acknowledging that authorities can be wrong."
		},
		{
			type: "SLIPPERY_SLOPE",
			description: "Claiming one event leads to extreme consequences",
			explanation: "This fallacy suggests that a relatively small first step will inevitably lead to a chain of related events resulting in a significant and usually negative effect."
		},
		{
			type: "FALSE_DICHOTOMY",
			description: "Presenting only two options when more exist",
			explanation: "This fallacy presents a situation as having only two possible outcomes or solutions, when in reality there are more options available."
		},
		{
			type: "CIRCULAR_REASONING",
			description: "Using conclusion to prove premises",
			explanation: "This fallacy occurs when the conclusion of an argument is used as one of its premises. The argument essentially assumes what it's trying to prove."
		},
		{
			type: "HASTY_GENERALIZATION",
			description: "Drawing conclusions from insufficient evidence",
			explanation: "This fallacy occurs when someone draws a general conclusion based on a sample that is too small or biased to support that conclusion."
		},
		{
			type: "APPEAL_TO_EMOTION",
			description: "Using emotions instead of logic",
			explanation: "This fallacy attempts to manipulate an emotional response in place of a valid or compelling argument, appealing to fear, pity, flattery, or other emotions."
		},
		{
			type: "RED_HERRING",
			description: "Introducing irrelevant information to distract",
			explanation: "This fallacy involves introducing an irrelevant topic to divert attention from the original issue, attempting to change the subject rather than address the argument."
		},
	];

	return (
		<div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex w-full items-center justify-between text-sm font-medium text-gray-500 dark:text-gray-400 mb-2"
			>
				<h3>Fallacy Types</h3>
				{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
			</button>

			<AnimatePresence>
				{isExpanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3 }}
						className="overflow-hidden"
					>
						<div className="flex flex-col space-y-2 mt-2">
							{fallacyDefinitions.map(({ type, description }) => {
								const color = getFallacyColor(type, 1);
								return (
									<div
										key={type}
										className="flex items-center text-xs relative cursor-help"
										onMouseEnter={() => setHoveredFallacy(type)}
										onMouseLeave={() => setHoveredFallacy(null)}
										onClick={(e) => {
											e.stopPropagation();
											setStickiedFallacy(prev => (prev === type ? null : type));
										}}
									>
										<span
											className="mr-2 inline-block h-3 w-3 rounded-full flex-shrink-0"
											style={{ backgroundColor: color }}
										/>
										<span className="text-gray-700 dark:text-gray-300">{type.replace(/_/g, " ")}</span>

										<AnimatePresence>
											{(hoveredFallacy === type || stickiedFallacy === type) && (
												<motion.div
													initial={{ opacity: 0, scale: 0.95 }}
													animate={{ opacity: 1, scale: 1 }}
													exit={{ opacity: 0, scale: 0.95 }}
													className="absolute left-0 z-50 mt-1 w-64 rounded-lg bg-white p-3 shadow-lg dark:bg-gray-800"
													style={{ top: "100%" }}
												>
													<div className="mb-1 font-semibold text-sm" style={{ color }}>
														{type.replace(/_/g, " ")}
													</div>
													<p className="text-xs mb-1 font-medium">{description}</p>
													<p className="text-xs text-gray-600 dark:text-gray-300">
														{fallacyDefinitions.find(def => def.type === type)?.explanation}
													</p>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								);
							})}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
