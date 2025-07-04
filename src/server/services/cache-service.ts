import { env } from "@/env";
import { logger } from "@/lib/logger";
import type { AnalysisResult } from "@/types/fallacy";
import { Redis } from "@upstash/redis";
import { metrics, metricsService } from "./metrics-service";

// Try to create Redis instance if configured
let redis: Redis | null = null;
try {
	if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
		redis = new Redis({
			url: env.UPSTASH_REDIS_REST_URL,
			token: env.UPSTASH_REDIS_REST_TOKEN,
		});
		logger.info("Redis cache initialized");
	} else {
		logger.info("Redis not configured, caching disabled");
	}
} catch (error) {
	logger.error("Failed to initialize Redis", { error });
}

// Simple in-memory fallback cache for when Redis is not available
const memoryCache = new Map<
	string,
	{
		data: any;
		createdAt: number;
		updatedAt: number;
		expiresAt: number;
	}
>();

export interface CacheConfig {
	ttl?: number; // Time to live in seconds
	staleWhileRevalidate?: number; // Additional time to serve stale content while revalidating
}

export interface CacheEntry<T> {
	data: T;
	createdAt: number;
	updatedAt: number;
}

export class CacheService {
	private readonly prefix = "cache";
	private readonly enabled = !!redis;

	// Stats tracking for in-memory cache
	private totalRequests = 0;
	private cacheHits = 0;

	/**
	 * Gets a value from cache
	 */
	async get<T>(key: string): Promise<T | null> {
		this.totalRequests++;

		// Try Redis first if enabled
		if (this.enabled) {
			try {
				const startTime = Date.now();
				const data = await redis!.get(`${this.prefix}:${key}`);
				await metricsService.recordTiming(metrics.cache.latency, startTime);

				if (!data) {
					await metricsService.incrementCounter(metrics.cache.misses);
					// Fall back to memory cache if Redis misses
					return this.getFromMemoryCache<T>(key);
				}

				await metricsService.incrementCounter(metrics.cache.hits);
				this.cacheHits++;
				return typeof data === "string" ? (JSON.parse(data) as T) : null;
			} catch (error) {
				logger.error("Failed to get from cache", { key, error });
				await metricsService.incrementCounter(metrics.cache.errors);
				// Fall back to memory cache on error
				return this.getFromMemoryCache<T>(key);
			}
		}

		// If Redis is not enabled, use memory cache
		return this.getFromMemoryCache<T>(key);
	}

	/**
	 * Gets a value from the in-memory cache
	 */
	private getFromMemoryCache<T>(key: string): T | null {
		this.cleanExpiredEntries();
		const cacheKey = `${this.prefix}:${key}`;
		const cached = memoryCache.get(cacheKey);

		if (cached && cached.expiresAt > Date.now()) {
			this.cacheHits++;
			return cached.data as T;
		}

		return null;
	}

	/**
	 * Sets a value in cache
	 */
	async set<T>(key: string, value: T, config: CacheConfig = {}): Promise<void> {
		const entry: CacheEntry<T> = {
			data: value,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		// Set in Redis if enabled
		if (this.enabled) {
			try {
				if (config.ttl) {
					await redis!.setex(`${this.prefix}:${key}`, config.ttl, JSON.stringify(entry));
				} else {
					await redis!.set(`${this.prefix}:${key}`, JSON.stringify(entry));
				}
			} catch (error) {
				logger.error("Failed to set cache", { key, error });
				await metricsService.incrementCounter(metrics.cache.errors);
				// Fall back to memory cache on error
				this.setInMemoryCache(key, value, config);
			}
		} else {
			// If Redis is not enabled, use memory cache
			this.setInMemoryCache(key, value, config);
		}
	}

	/**
	 * Sets a value in the in-memory cache
	 */
	private setInMemoryCache<T>(key: string, value: T, config: CacheConfig = {}): void {
		const cacheKey = `${this.prefix}:${key}`;
		const now = Date.now();
		const ttlMs = config.ttl ? config.ttl * 1000 : 24 * 60 * 60 * 1000; // Default 24 hours

		memoryCache.set(cacheKey, {
			data: value,
			createdAt: now,
			updatedAt: now,
			expiresAt: now + ttlMs,
		});
	}

	/**
	 * Deletes a value from cache
	 */
	async delete(key: string): Promise<void> {
		const cacheKey = `${this.prefix}:${key}`;

		// Delete from Redis if enabled
		if (this.enabled) {
			try {
				await redis!.del(cacheKey);
			} catch (error) {
				logger.error("Failed to delete from cache", { key, error });
				await metricsService.incrementCounter(metrics.cache.errors);
			}
		}

		// Always delete from memory cache as well
		memoryCache.delete(cacheKey);
	}

	/**
	 * Gets a value from cache or computes it if not found
	 */
	async getOrSet<T>(key: string, factory: () => Promise<T>, config: CacheConfig = {}): Promise<T> {
		const cached = await this.get<CacheEntry<T>>(key);

		// If we have a cached value and it's not stale, return it
		if (cached && this.isValid(cached, config)) {
			return cached.data;
		}

		// If we have a stale value and staleWhileRevalidate is set,
		// revalidate in the background and return stale data
		if (cached && config.staleWhileRevalidate && this.isStale(cached, config)) {
			void this.revalidate(key, factory, config);
			return cached.data;
		}

		// Otherwise, compute the value and cache it
		const value = await factory();
		await this.set(key, value, config);
		return value;
	}

	/**
	 * Checks if a cached entry is still valid
	 */
	private isValid(entry: CacheEntry<unknown>, config: CacheConfig): boolean {
		if (!config.ttl) return true;
		const age = Date.now() - entry.updatedAt;
		return age < config.ttl * 1000;
	}

	/**
	 * Checks if a cached entry is stale but still usable
	 */
	private isStale(entry: CacheEntry<unknown>, config: CacheConfig): boolean {
		if (!config.ttl || !config.staleWhileRevalidate) return false;
		const age = Date.now() - entry.updatedAt;
		return age >= config.ttl * 1000 && age < (config.ttl + config.staleWhileRevalidate) * 1000;
	}

	/**
	 * Revalidates a cached value in the background
	 */
	private async revalidate<T>(
		key: string,
		factory: () => Promise<T>,
		config: CacheConfig
	): Promise<void> {
		try {
			const value = await factory();
			await this.set(key, value, config);
		} catch (error) {
			logger.error("Failed to revalidate cache", { key, error });
			await metricsService.incrementCounter(metrics.cache.errors);
		}
	}

	/**
	 * Clean expired entries from the in-memory cache
	 */
	private cleanExpiredEntries(): void {
		const now = Date.now();
		for (const [key, value] of memoryCache.entries()) {
			if (value.expiresAt < now) {
				memoryCache.delete(key);
			}
		}
	}

	/**
	 * Get cache statistics
	 */
	async getCacheStats(): Promise<{
		totalKeys: number;
		hitRate: number;
		redisEnabled: boolean;
	}> {
		this.cleanExpiredEntries();

		let redisKeyCount = 0;
		if (this.enabled) {
			try {
				// This is a simplified approach - in a real app you might want to use SCAN
				// or another method to count keys with your prefix
				const keys = await redis!.keys(`${this.prefix}:*`);
				redisKeyCount = keys.length;
			} catch (error) {
				logger.error("Failed to get Redis key count", { error });
			}
		}

		return {
			totalKeys: this.enabled ? redisKeyCount : memoryCache.size,
			hitRate: this.totalRequests > 0 ? this.cacheHits / this.totalRequests : 0,
			redisEnabled: this.enabled,
		};
	}

	// Analysis-specific cache methods

	/**
	 * Generate a cache key for a text analysis
	 */
	private generateAnalysisCacheKey(text: string): string {
		return Buffer.from(text).toString("base64");
	}

	/**
	 * Get cached analysis result
	 */
	async getCachedAnalysis(text: string): Promise<AnalysisResult | null> {
		const key = this.generateAnalysisCacheKey(text);
		return this.get<AnalysisResult>(key);
	}

	/**
	 * Cache analysis result
	 */
	async cacheAnalysis(text: string, result: AnalysisResult, ttlSeconds = 86400): Promise<void> {
		const key = this.generateAnalysisCacheKey(text);
		await this.set(key, result, { ttl: ttlSeconds });
	}

	/**
	 * Invalidate cached analysis
	 */
	async invalidateAnalysis(text: string): Promise<void> {
		const key = this.generateAnalysisCacheKey(text);
		await this.delete(key);
	}
}

export const cacheService = new CacheService();

// Common cache configurations
export const cacheConfigs = {
	short: {
		ttl: 60, // 1 minute
		staleWhileRevalidate: 60, // 1 minute
	},
	medium: {
		ttl: 300, // 5 minutes
		staleWhileRevalidate: 300, // 5 minutes
	},
	long: {
		ttl: 3600, // 1 hour
		staleWhileRevalidate: 1800, // 30 minutes
	},
	day: {
		ttl: 86400, // 24 hours
		staleWhileRevalidate: 3600, // 1 hour
	},
} as const;
