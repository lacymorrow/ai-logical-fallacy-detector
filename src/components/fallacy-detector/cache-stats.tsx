"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

interface CacheStats {
	totalKeys: number;
	hitRate: number;
	redisEnabled: boolean;
}

export function CacheStats() {
	const [stats, setStats] = useState<CacheStats | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const fetchStats = async () => {
		try {
			const response = await fetch("/api/cache/stats");
			if (!response.ok) {
				throw new Error("Failed to fetch cache stats");
			}
			const data = await response.json();
			setStats(data);
		} catch (error) {
			console.warn("Error fetching cache stats:", error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchStats();
		// Refresh stats every minute
		const interval = setInterval(fetchStats, 60000);
		return () => clearInterval(interval);
	}, []);

	if (isLoading) {
		return (
			<Card className="p-4">
				<div className="space-y-2">
					<Skeleton className="h-4 w-1/2" />
					<Skeleton className="h-4 w-3/4" />
				</div>
			</Card>
		);
	}

	if (!stats) {
		return null;
	}

	return (
		<Card className="p-4">
			<div className="space-y-4">
				<div>
					<h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
						Cached Analyses
					</h4>
					<p className="text-2xl font-bold">{stats.totalKeys}</p>
				</div>

				{stats.hitRate !== undefined && (
					<div>
						<div className="flex items-center justify-between">
							<h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
								Cache Hit Rate
							</h4>
							<span className="text-sm font-medium">
								{Math.round(stats.hitRate * 100)}%
							</span>
						</div>
						<Progress
							value={stats.hitRate * 100}
							className="mt-2"
						/>
					</div>
				)}

				<div className="text-xs text-gray-500 dark:text-gray-400">
					Cache Type: {stats.redisEnabled ? 'Redis (distributed)' : 'In-memory'}
				</div>
			</div>
		</Card>
	);
}
