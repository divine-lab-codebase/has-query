/** Defines a GraphQL query structure with optional transformation and invalidation.
 * @template Variables - The type of variables accepted by the query.
 * @template RawOutput - The raw output type returned by the GraphQL query.
 * @template Output - The final output type after applying the optional transform function. Defaults to RawOutput.
 * @template Context - The type of context that can be passed to the key function and invalidate function. Defaults to an empty object.
 * @example
 * const query: GQL<{ id: string }, { users_by_pk: { name: string } | null }, { name: string } | null> = {
 *     key: (variables) => `user:${variables.id}`,
 *     query: `query GET_USER($id: String!) { users_by_pk(id: $id) { name } }`,
 *     transform: (data) => data.users_by_pk,
 *     timeout: 3600,
 * }
 */
export type GQL<Variables extends Record<string, any>, RawOutput, Output = RawOutput, Context extends Record<string, any> = {}> = {
    readonly key?: (variables: Variables, context: Context) => string;
    readonly query: string;
    readonly transform?: (data: RawOutput, variables: Variables, context: Context) => Output;
    readonly errorHandler?: (error: unknown, variables: Variables) => void;
    readonly timeout?: number;
    readonly invalidate?: (variables: Variables, context: Context, rawData: RawOutput, transformedData: Output) => string[];
};
