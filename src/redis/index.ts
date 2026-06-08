import { CacheClient } from "./client";
import logger from "@divine-lab/logger";
import { COLORS } from "@divine-lab/logger/colors";

const ENABLE_REDIS_CACHE = process.env.ENABLE_REDIS_CACHE === "true";
const REDIS_PUBLISHER_CHANNEL = process.env.REDIS_PUBLISHER_CHANNEL;
if (ENABLE_REDIS_CACHE && !REDIS_PUBLISHER_CHANNEL) logger.exit(0, `${COLORS.red}[HAS-QUERY]${COLORS.reset} - [REDIS] - ${COLORS.gray}REDIS_PUBLISHER_CHANNEL${COLORS.reset} environment variable not set.`);

/** Get a value from the cache by key. Returns null if the key is not found or if an error occurs.
 * @param key The cache key to retrieve.
 * @returns The cached value, or null if not found or on error.
 */
export async function get<T>(key: string): Promise<T | null> {
    try {
        const client = CacheClient.getReader();
        const data = await client.get(key);
        if (data === null) return null;
        return JSON.parse(data) as T;
    } catch (error) {
        logger.error(`${COLORS.red}[HAS-QUERY]${COLORS.reset} - [CACHE] - Failed to get cache for key "${key}": ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/** Set a value in the cache with an optional expiration time.
 * @param key The cache key to set.
 * @param value The value to cache.
 * @param expireIn Optional expiration time in seconds. If not provided, the cache will not expire.
 */
export async function set<T>(key: string, value: T, expireIn?: number): Promise<void> {
    try {
        const client = CacheClient.getWriter();
        if (expireIn && expireIn > 0) await client.set(key, JSON.stringify(value), { EX: expireIn });
        else await client.set(key, JSON.stringify(value));
        return;
    } catch (error) {
        logger.error(`${COLORS.red}[HAS-QUERY]${COLORS.reset} - [CACHE] - Failed to set cache for key "${key}": ${error instanceof Error ? error.message : String(error)}`);
        return;
    }
}

/** Invalidate cache entries for the given keys. This will remove the keys from the cache and publish an invalidation message to the Redis channel.
 * @param keys An array of cache keys to invalidate.
 */
export async function invalidate(keys: string[]): Promise<void> {
    try {
        if (keys.length === 0) return;
        const client = CacheClient.getWriter();
        await client.unlink(keys);
        const publisher = CacheClient.getPublisher();
        await publisher.publish(REDIS_PUBLISHER_CHANNEL!, JSON.stringify({ type: "invalidate", keys }));
    } catch (error) {
        logger.error(`${COLORS.red}[HAS-QUERY]${COLORS.reset} - [CACHE] - Failed to invalidate cache for keys "${keys.join(", ")}": ${error instanceof Error ? error.message : String(error)}`);
    }
}
