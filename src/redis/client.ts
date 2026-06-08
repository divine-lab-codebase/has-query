import { createClient, RedisClientType } from "redis";
import logger from "@divine-lab/logger";
import { COLORS, colorize } from "@divine-lab/logger/colors";

//#region ---- Environment Variable Validation ----
const ENABLE_REDIS_CACHE = process.env.ENABLE_REDIS_CACHE === "true";
if (!ENABLE_REDIS_CACHE) logger.warn(`${colorize("yellow", "[HAS-QUERY]")} - [REDIS] - ${colorize("gray", "ENABLE_REDIS_CACHE")} is set to false. Redis caching is disabled.`);
else logger.log(`${colorize("green", "[HAS-QUERY]")} - [REDIS] - ${colorize("gray", "ENABLE_REDIS_CACHE")} is set to true. Redis caching is enabled.`);

const REDIS_CACHE_URL = process.env.REDIS_CACHE_URL;
const REDIS_CACHE_PASSWORD = process.env.REDIS_CACHE_PASSWORD;
if (ENABLE_REDIS_CACHE && !REDIS_CACHE_URL) logger.exit(0, `${COLORS.red}[HAS-QUERY]${COLORS.reset} - [REDIS] - ${COLORS.gray}REDIS_CACHE_URL${COLORS.reset} environment variable not set.`);
if (ENABLE_REDIS_CACHE && !REDIS_CACHE_PASSWORD) logger.warn(`${COLORS.red}[HAS-QUERY]${COLORS.reset} - [REDIS] - ${COLORS.gray}REDIS_CACHE_PASSWORD${COLORS.reset} environment variable not set.`);
//#endregion

/**
 * CacheClient manages Redis connections for reading, writing, and publishing.
 * It initializes three separate clients for different purposes to optimize performance and reliability.
 * Each client has error handling and reconnection logic to ensure stability.
 */
export class CacheClient {
    private static reader: RedisClientType = createClient({ url: REDIS_CACHE_URL, password: REDIS_CACHE_PASSWORD, socket: { reconnectStrategy: 1000 } });
    private static writer: RedisClientType = createClient({ url: REDIS_CACHE_URL, password: REDIS_CACHE_PASSWORD, socket: { reconnectStrategy: 1000 } });
    private static publisher: RedisClientType = createClient({ url: REDIS_CACHE_URL, password: REDIS_CACHE_PASSWORD, socket: { reconnectStrategy: 1000 } });

    static async init() {
        if (!ENABLE_REDIS_CACHE) return;

        this.reader.on("error", (err) => logger.error(`${colorize("red", "[HAS-QUERY]")} - [REDIS]`, `Reader client error: ${err.message}`));
        this.writer.on("error", (err) => logger.error(`${colorize("red", "[HAS-QUERY]")} - [REDIS]`, `Writer client error: ${err.message}`));
        this.publisher.on("error", (err) => logger.error(`${colorize("red", "[HAS-QUERY]")} - [REDIS]`, `Publisher client error: ${err.message}`));

        this.reader.on("reconnecting", () => logger.warn(`${colorize("yellow", "[HAS-QUERY]")} - [REDIS]`, "Reader client reconnecting..."));
        this.writer.on("reconnecting", () => logger.warn(`${colorize("yellow", "[HAS-QUERY]")} - [REDIS]`, "Writer client reconnecting..."));
        this.publisher.on("reconnecting", () => logger.warn(`${colorize("yellow", "[HAS-QUERY]")} - [REDIS]`, "Publisher client reconnecting..."));

        this.reader.on("connect", () => logger.log(`${colorize("green", "[HAS-QUERY]")} - [REDIS]`, "Reader client connected"));
        this.writer.on("connect", () => logger.log(`${colorize("green", "[HAS-QUERY]")} - [REDIS]`, "Writer client connected"));
        this.publisher.on("connect", () => logger.log(`${colorize("green", "[HAS-QUERY]")} - [REDIS]`, "Publisher client connected"));

        const clients = [this.reader, this.writer, this.publisher];
        await Promise.all(clients.map((c) => c.connect()));
    }

    static getReader(): RedisClientType {
        if (!ENABLE_REDIS_CACHE) throw new Error("Redis cache is disabled.");
        if (!this.reader.isReady) throw new Error("Redis reader not ready.");
        return this.reader;
    }

    static getWriter(): RedisClientType {
        if (!ENABLE_REDIS_CACHE) throw new Error("Redis cache is disabled.");
        if (!this.writer.isReady) throw new Error("Redis writer not ready.");
        return this.writer;
    }

    static getPublisher(): RedisClientType {
        if (!ENABLE_REDIS_CACHE) throw new Error("Redis cache is disabled.");
        if (!this.publisher.isReady) throw new Error("Redis publisher not ready.");
        return this.publisher;
    }
}

if (ENABLE_REDIS_CACHE) CacheClient.init().catch((err) => logger.error(`${colorize("red", "[HAS-QUERY]")} - [REDIS]`, `Failed to initialize Redis clients: ${err.message}`));
