type QueryErrorType = "gql" | "sql";

export class QueryError extends Error {
    public readonly type: QueryErrorType;
    public readonly query: string;
    public readonly variables: Record<string, any>;
    public readonly context: Record<string, any>;
    public readonly key?: string;

    constructor(type: QueryErrorType, query: string, variables: Record<string, any>, context: Record<string, any>, message: string, key?: string) {
        super(message);
        this.type = type;
        this.query = query;
        this.variables = variables;
        this.context = context;
        this.key = key;
    }
}
