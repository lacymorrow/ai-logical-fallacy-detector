import { CacheStats } from "@/components/fallacy-detector/cache-stats";
import { FallacyDetector } from "@/components/fallacy-detector/fallacy-detector";
import { FallacyLegend } from "@/components/fallacy-detector/fallacy-legend";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Logical Fallacy Detector",
	description: "Analyze text for logical fallacies using AI",
};

export default function FallacyDetectorPage() {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
			<div className="lg:col-span-3">
				<FallacyDetector />
			</div>
			<div className="lg:col-span-1">
				<div className="space-y-6">
					<FallacyLegend />
				</div>
			</div>
		</div>

	);
}
