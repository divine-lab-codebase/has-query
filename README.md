# @divine-lab/has-query

Simple GraphQl utility library, provides a TypeScript Type and a function to define and execute GraphQl Queries using hasura.

## Installation

Install the library using npm

```bash
npm install @divine-lab/has-query
```

## Setup

The library requires 2 Environment variablesto operate.

- `DIVINE_LAB_HAS_QUERY_HASURA_GRAPHQL_URL`: The hasura graphql endpoint for requests.
- `DIVINE_LAB_HAS_QUERY_HASURA_GRAPHQL_ADMIN_SECRET`: The hasura Admin Secret.

## Exports

The library provides the following exports for GraphQl.

- `GQL`: TypeScript type for query definition.
- `execute`: Function to execute defined GraphQl queries.

```typescript
import { GQL } from "@divine-lab/has-query/gql";
import { execute } from "@divine-lab/has-query/gql";
```

---

## GQL

TypeScript Type GQL, is a templated type, which is used to defined queries or mutations, It takes in 4 types for the template to be compatiable with TypeScript.

```typescript
export type GQL<
    Variables extends Record<string, any>,      // Variables needed for query/mutation
    RawOutput,                                  // Raw GraphQl Output
    Output = RawOutput,                         // Expected output for user (if not defined then equal to RawOutput)
    Context extends Record<string, any> = {}    // Execution context
> = {
    // Standard GraphQL Handlers
    readonly query: string;
    readonly transform?: (data: RawOutput, variables: Variables, context: Context) => Output;
    readonly errorHandler?: (error: unknown, variables: Variables) => void;

    // Redis Caching Support values
    readonly key?: (variables: Variables, context: Context) => string;
    readonly timeout?: number;
    readonly invalidate?: (variables: Variables, context: Context, rawData: RawOutput, transformedData: Output) => string[];
    readonly invalidatePrefixes?: (variables: Variables, context: Context, rawData: RawOutput, transformedData: Output) => string[];
};
```

### Templates

The Type templates the following:

- `variables`: (Required) These are the input values for the query/mutation, Example: email when searching by email, these are always a Record {}
- `RawOutput`: (Required) This is the raw output received from the successful graphQl query/mutation
- `Output`: (Optional) This is the type of the result which the user should expect to be returned after transformations (if any), it equals to the RawOut by default meaning no transformations occur by default.
- `context`: (optional) This is a Record which is useful for cache key generation or cache invalidation.

Usage:

```typescript
// Import Type
import { GQL } from "@divine-lab/has-query/gql";

// Helper User Type
type User = { id: string; name: string; email: string };

// Define the types for Variables, RawOutput, Output and context
type Variables = { userId: string };    // Query would need the userId
type RawOutput = { user: User | null }; // Query would return the user in this format
type Output = User | null;              // Transform the result to this type, so that API consumers get it formatted
type Context = {};                      // Useful for defining caching behaviour

// Define the GQL Template type
type GetUserByIdGQL = GQL<Variables, RawOutput, Output, context>;
```

### Fields

An object of the GQL type must define the following fields:

- `query`: (required) The actual graphQl query/mutation as a `string`.
- `transform`: (optional) A function with arguments:
    - `data`: The returned **RawOutput** of the graphQl query/mutation.
    - `variables`: The variables used in the query/mutation.
    - `context`: The context variables.
      With the return being of the type `Output`
- `errorHandler`: (optional) A custom error handler, useful for formatting mutation errors, it takes the following arguments
    - `error`: The error object
    - `variables`: The variables used in the query/mutation.
      With there being no return from this function, (recommended to throw an error in this function when used)

There are other fields as well, which define the caching behaviour for the library

- `key`: (optional) A function to calucate the cache key, it takes in variables and context as input and returns a string.
- `timeout`: (optional) TTL for the cahce in seconds, (0 or undefined will result in a non-expiring cache entry).
- `invalidate`: (optional) A function which returns an array of strings (cache-keys) to invalidate. It takes the following inputs: (variables, context, rawOutput, transformedOutput)
- `invalidatePrefixes`: (optional) A function Similar to invalidate, but it invalidates all keys with the similar prefix to the output.

```typescript
import { GQL } from "@divine-lab/has-query/gql";

type User = { id: string; name: string; email: string };

const getUserByIdQuery: GQL<
    { userId: User["id"] },                                                 // Query Variables
    { user: { name: User["name"]; email: User["email"] } | null },          // Query RawOutput
    { id: User["id"]; name: User["name"]; email: User["email"]; } | null    // Query Output (transformed)
    { }                                                                     // Query context (empty)
> = {
    query: `query GetUserById(
        $userId: uuid!
    ) {
        user: users_by_pk($id: $userId) {
            name
            email
        }
    }`,
    transform: (data, variables) => (data.user ? { ...data.user, id: variables.userId } : null),    // using transform to format data into desired output
    key: (variables, context) => `user:${variables.userId}`,                    // cache key should be calucalted as user:{userId}
    timeout: 60,                                                                // cache should last 60 seconds
    // No invalidates since this is a simple query
};

const deleteUserById: GQL<
    { userId: User["id"] },                                                 // Mutation Variables
    { user: { name: User["name"]; email: User["email"] } | null },          // Mutation RawOutput
    { id: User["id"]; name: User["name"]; email: User["email"]; } | null    // Mutation Output (transformed)
    { }                                                                     // Mutation context (empty)
> = {
    query: `mutation DeleteUserById(
        $userId: uuid!
    ) {
        user: delete_users_by_pk($id: $userId) {
            name
            email
        }
    }`,
    transform: (data, variables) => (data.user ? { ...data.user, id: variables.userId } : null); // Using transform to format data into desiired output
    invalidate: (variables) => [`user:${userId}`]           // Invalidate any cache entries for the user
    invalidatePrefixes: (variables) => [`user:${userId}`]   // Invalidate any cache entries pertaining to the user
}
```

---

## Execute

After queries/mutations has been defined using the GQL type, they can be used using the `execute` helper function.

This function takes in the following arguments:

- `query`: The GQL type query to execute.
- `variables`: The GQL template defined variables.
- `context`: The GQL template defined context.

And returns:

- `output`: The GQL template defined output.

```typescript
import { getUserByIdQuery } from "./repository/queries";
import { deleteUserById } from "./repository/mutations";

import { execute } from "@divine-lab/has-query/gql";

const userId = "...";
const user = await execute(getUserByIdQuery, { userId }, {});
console.log(user); // -> { id, name, email } OR null

// ...

const user = await execute(deleteUserById, { userId }, {});
console.log(user); // -> { id, name, email } OR null
```

---
