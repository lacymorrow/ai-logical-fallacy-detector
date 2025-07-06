import { cacheService } from "@/server/services/cache-service";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const stats = await cacheService.getCacheStats();
		return NextResponse.json(stats, {
			headers: {
				"Cache-Control": "no-cache",
			},
		});
	} catch (error) {
		console.error("Error getting cache stats:", error);
		return NextResponse.json({ error: "Failed to get cache statistics" }, { status: 500 });
	}
}
