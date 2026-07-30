import { QueryError } from "../errors/QueryError.js";
import { colorize } from "@divine-lab/logger/colors";
import hasQueryGlobalState from "../index.js";
import logger from "@divine-lab/logger";
import HasuraClient from "./client.js";
import { type GQL } from "./type.js";

/**
 * Executes a GraphQL query defined by the GQL type, with optional caching and transformation.
 * @template Variables - The type of variables accepted by the query.
 * @template RawOutput - The raw output type returned by the GraphQL query.
 * @template Output - The final output type after applying the optional transform function. Defaults to RawOutput.
 * @template Context - The type of the context object that can be used in key generation, transformation, and invalidation. Defaults to an empty object.
 * @param query - The GQL query definition containing the GraphQL string, optional key function for caching, transform function, error handler, timeout, and invalidate function.
 * @param variables - The variables to be passed to the GraphQL query.
 * @param context - An optional context object that can be used in the key function, transform function, and invalidate function for more dynamic behavior.
 * @returns A promise that resolves to the transformed output of the GraphQL query.
 * @throws APIError if there is an error during execution of the GraphQL query.
 * @example
 * const query: GQL<{ id: string }, { users_by_pk: { name: string } | null }, { name: string } | null, {}> = {
 *     key: (variables, context) => `user:${variables.id}`,
 *     query: `query GET_USER($id: String!) { users_by_pk(id: $id) { name } }`,
 *     transform: (data, variables) => data.users_by_pk,
 *     timeout: 3600
 * }
 * const user = await executeGQL(query, { id: "123" }, {});
 */
export async function execute<Variables extends Record<string, any>, RawOutput, Output = RawOutput, Context extends Record<string, any> = {}>(query: GQL<Variables, RawOutput, Output, Context>, variables: Variables, context: Context): Promise<Output> {
    try {
        // 1. Check cache if key function is provided and cache is enabled to fetch from cache directly
        if (query.key && hasQueryGlobalState.CACHE) {
            const cacheKey = query.key(variables, context);
            const cachedData = await hasQueryGlobalState.CACHE.get<Output>(cacheKey);
            if (cachedData) return cachedData;
        }

        // 2. Execute GraphQL query and apply transformation if provided
        const client = HasuraClient.getInstance();
        const rawData = await client.request<RawOutput>(query.query, variables);
        const result = query.transform ? query.transform(rawData, variables, context) : (rawData as unknown as Output);

        // 3. Store in cache if key function is provided and invalidate any relevant cache keys
        if (query.key && hasQueryGlobalState.CACHE) {
            hasQueryGlobalState.CACHE.set(query.key(variables, context), result as any, query.timeout || 0).catch((error) => logger.error(`${colorize("red", "[@divine-lab/has-query]")} Failed to set cache for GraphQL query.`, { error, key: query.key!(variables, context), variables }));
        }
        if (query.invalidate && hasQueryGlobalState.CACHE) {
            hasQueryGlobalState.CACHE.invalidate(query.invalidate(variables, context, rawData, result)).catch((error) => logger.error(`${colorize("red", "[@divine-lab/has-query]")} Failed to invalidate cache for GraphQL query.`, { error, keysToInvalidate: query.invalidate!(variables, context, rawData, result), variables }));
        }
        if (query.invalidatePrefixes && hasQueryGlobalState.CACHE) {
            hasQueryGlobalState.CACHE.invalidatePrefixes(query.invalidatePrefixes(variables, context, rawData, result)).catch((error) => logger.error(`${colorize("red", "[@divine-lab/has-query]")} Failed to invalidate cache prefixes for GraphQL query.`, { error, prefixesToInvalidate: query.invalidatePrefixes!(variables, context, rawData, result), variables }));
        }

        // 4. Return the final result
        return result;
    } catch (error) {
        if (query.errorHandler) query.errorHandler(error, variables);
        logger.error(`${colorize("red", "[@divine-lab/has-query]")} An error occurred while executing the GraphQL query.`, { error, variables });
        throw new QueryError("gql", query.query, variables, context, (error as Error).message, query.key ? query.key(variables, context) : undefined);
    }
}

export * from "./type.js";
