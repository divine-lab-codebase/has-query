import hasQueryGlobalState from "../index.js";
import logger from "@divine-lab/logger";
import { COLORS } from "@divine-lab/logger/colors";

//#region ---- Setup environment variables ----
const HASURA_GRAPHQL_ENDPOINT = hasQueryGlobalState.HASURA_GRAPHQL_URL;
if (!HASURA_GRAPHQL_ENDPOINT) logger.exit(1, `${COLORS.red}[@divine-lab/has-query]${COLORS.reset} - [GQL] - ${COLORS.gray}DIVINE_LAB_HAS_QUERY_HASURA_GRAPHQL_URL${COLORS.reset} environment variable not set. EXITING.`);
const HASURA_GRAPHQL_ADMIN_SECRET = hasQueryGlobalState.HASURA_GRAPHQL_ADMIN_SECRET;
if (!HASURA_GRAPHQL_ADMIN_SECRET) logger.exit(1, `${COLORS.red}[@divine-lab/has-query]${COLORS.reset} - [GQL] - ${COLORS.gray}DIVINE_LAB_HAS_QUERY_HASURA_GRAPHQL_ADMIN_SECRET${COLORS.reset} environment variable not set. EXITING.`);
//#endregion

/**
 * HasuraClient is a singleton class that provides a simple interface for sending GraphQL requests to a Hasura endpoint.
 */
class HasuraClient {
    // ---- Singleton instance ----
    private static instance: HasuraClient;
    private readonly endpoint: string;
    private readonly adminSecret?: string;

    /**
     * Private constructor to enforce singleton pattern. Use HasuraClient.getInstance() to get the instance.
     */
    private constructor() {
        this.endpoint = HASURA_GRAPHQL_ENDPOINT!;
        this.adminSecret = HASURA_GRAPHQL_ADMIN_SECRET!;
    }

    /**
     * Get the singleton instance of HasuraClient. If it doesn't exist, it will be created.
     * @returns HasuraClient The singleton instance of HasuraClient.
     */
    static getInstance(): HasuraClient {
        if (!HasuraClient.instance) HasuraClient.instance = new HasuraClient();
        return HasuraClient.instance;
    }

    /**
     * Send a GraphQL request to the Hasura endpoint.
     * @param query The GraphQL query or mutation string.
     * @param variables Optional variables for the GraphQL query or mutation.
     * @returns A promise that resolves to the data returned by Hasura.
     * @throws An error if the request fails or if Hasura returns errors.
     */
    async request<T>(query: string, variables?: Record<string, any>): Promise<T> {
        const res = await fetch(this.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(this.adminSecret && { "x-hasura-admin-secret": this.adminSecret }) },
            body: JSON.stringify({ query, variables }),
        });
        const json = await res.json();
        if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
        return json.data as T;
    }
}

export default HasuraClient;
