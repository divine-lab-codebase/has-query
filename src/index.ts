import logger from "@divine-lab/logger";
import { colorize } from "@divine-lab/logger/colors";

const GLOBAL_HAS_QUERY_KEY = Symbol.for("divine-lab.has-query");

type hasQueryData = {
    CACHE: (typeof import("@divine-lab/cache"))["default"] | undefined;
    HASURA_GRAPHQL_URL?: string;
    HASURA_GRAPHQL_ADMIN_SECRET?: string;
};
type hasQueryState = typeof globalThis & { [GLOBAL_HAS_QUERY_KEY]?: hasQueryData };
const hasQueryGlobalState: hasQueryState = globalThis;

if (!hasQueryGlobalState[GLOBAL_HAS_QUERY_KEY]) {
    logger.log(`${colorize("green", "[@divine-lab/has-query]")} Initializing global state for has-query...`);

    const CACHE = process.env.DIVINE_LAB_HAS_QUERY_CACHE_ENABLED === "true" ? (await import("@divine-lab/cache")).default : undefined;
    logger.log(`${colorize("green", "[@divine-lab/has-query]")} Cache enabled ${colorize("gray", "DIVINE_LAB_HAS_QUERY_CACHE_ENABLED")}: ${CACHE ? colorize("green", "true") : colorize("red", "false")}`);

    const HASURA_GRAPHQL_URL = process.env.DIVINE_LAB_HAS_QUERY_HASURA_GRAPHQL_URL;
    const HASURA_GRAPHQL_ADMIN_SECRET = process.env.DIVINE_LAB_HAS_QUERY_HASURA_GRAPHQL_ADMIN_SECRET;
    logger.log(`${colorize("green", "[@divine-lab/has-query]")} Hasura GraphQL URL ${colorize("gray", "DIVINE_LAB_HAS_QUERY_HASURA_GRAPHQL_URL")}: ${HASURA_GRAPHQL_URL}`);
    logger.log(`${colorize("green", "[@divine-lab/has-query]")} Hasura GraphQL Admin Secret ${colorize("gray", "DIVINE_LAB_HAS_QUERY_HASURA_GRAPHQL_ADMIN_SECRET")}: ${HASURA_GRAPHQL_ADMIN_SECRET ? colorize("green", "SET") : colorize("red", "NOT SET")}`);

    hasQueryGlobalState[GLOBAL_HAS_QUERY_KEY] = { CACHE, HASURA_GRAPHQL_URL, HASURA_GRAPHQL_ADMIN_SECRET };
}

export default hasQueryGlobalState[GLOBAL_HAS_QUERY_KEY] as hasQueryData;
