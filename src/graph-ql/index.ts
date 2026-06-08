import { type GQL } from "./type";
import { APIError } from "@divine-lab/request/errors";
import logger from "@divine-lab/logger";
import { colorize } from "@divine-lab/logger/colors";
import HasuraClient from "./client";
import * as cache from "../redis/index";

/** Executes a GraphQL query defined by the GQL type, with optional caching and transformation.
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
        // 1. Check cache if key function is provided
        if (query.key) {
            const cacheKey = query.key(variables, context);
            const cachedData = await cache.get<Output>(cacheKey);
            if (cachedData) return cachedData;
        }

        // 2. Execute GraphQL query and apply transformation if provided
        const client = HasuraClient.getInstance();
        const rawData = await client.request<RawOutput>(query.query, variables);
        const result = query.transform ? query.transform(rawData, variables, context) : (rawData as unknown as Output);

        // 3. Store in cache if key function is provided and invalidate any relevant cache keys
        if (query.key) cache.set(query.key(variables, context), result, query.timeout).catch((error) => logger.error(`${colorize("red", "[HAS-QUERY]")} Failed to set cache for GraphQL query.`, { error, key: query.key!(variables, context), variables }));
        if (query.invalidate) cache.invalidate(query.invalidate(variables, context, rawData, result)).catch((error) => logger.error(`${colorize("red", "[HAS-QUERY]")} Failed to invalidate cache for GraphQL query.`, { error, keysToInvalidate: query.invalidate!(variables, context, rawData, result), variables }));

        // 4. Return the final result
        return result;
    } catch (error) {
        if (query.errorHandler) query.errorHandler(error, variables);
        logger.error(`${colorize("red", "[HAS-QUERY]")} An error occurred while executing the GraphQL query.`, { error, variables });
        throw new APIError("INTERNAL_SERVER_ERROR", { detail: "An error occured while interacting with the Database." });
    }
}

export * from "./type";
