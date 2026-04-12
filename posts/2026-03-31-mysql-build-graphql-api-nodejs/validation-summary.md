# Validation Summary: How to Build a GraphQL API with MySQL and Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (via mysql2/promise)
- GraphQL
- Node.js
- Apollo Server v4 (@apollo/server)
- DataLoader
- graphql-tag

## Sources Consulted
- Apollo Server v4 documentation: https://www.apollographql.com/docs/apollo-server/
- graphql-tag npm package: https://www.npmjs.com/package/graphql-tag
- DataLoader GitHub repository: https://github.com/graphql/dataloader
- mysql2 npm package documentation: https://www.npmjs.com/package/mysql2
- GraphQL specification (field resolution): https://spec.graphql.org/

## Issues Found

### 1. Missing `graphql-tag` dependency in npm install
**What was wrong:** The `src/schema.js` file imports `gql` from `graphql-tag`, but the npm install command did not include `graphql-tag` as a dependency. Since `@apollo/server` does not include `graphql-tag` as a transitive dependency, the import would fail at runtime with a "Cannot find module" error.
**What was changed:** Added `graphql-tag` to the npm install command.

### 2. Missing field resolvers for `Order.userId` and `Order.createdAt` (snake_case to camelCase mismatch)
**What was wrong:** The GraphQL schema defines `userId` and `createdAt` fields on the Order type, but the MySQL queries return rows with snake_case column names (`user_id`, `created_at`). The SQL statements in the resolvers confirm this: `ORDER BY created_at DESC` and `INSERT INTO orders (user_id, ...)`. Without explicit field resolvers, GraphQL's default resolver looks for `order.userId` and `order.createdAt` on the row object, which don't exist — causing these fields to return `null`.
**What was changed:** Added `userId` and `createdAt` field resolvers to the `Order` type resolver that map from the snake_case MySQL column names to the camelCase GraphQL field names.

### 3. Missing `users` query resolver
**What was wrong:** The GraphQL schema defines `users: [User!]!` as a query field, but no corresponding resolver was implemented. Since the return type is non-nullable (`[User!]!`), querying `users` would result in a GraphQL error because the default resolver returns `null` for root query fields without a resolver.
**What was changed:** Added a `users` query resolver that queries all users from the database.

### 4. Missing `User.orders` field resolver
**What was wrong:** The `User` type in the schema defines `orders: [Order!]!`, but no field resolver existed. When querying users with nested orders, the default resolver would look for a non-existent `orders` property on the MySQL user row, returning `null` and triggering a GraphQL error on the non-nullable return type.
**What was changed:** Added a `User` type resolver with an `orders` field resolver that queries orders by `user_id`.

## Review Notes
- The `User.orders` resolver uses a per-user query rather than a DataLoader. In a production application with many users, this would cause an N+1 query problem. A `createOrderLoader` (similar to the existing `createUserLoader`) would be recommended for production use. However, this is a pedagogical simplification consistent with the tutorial's scope.
- The post does not include a `CREATE TABLE` migration script. While not strictly an error, including one would help readers set up the database correctly with matching column names.
- All SQL queries use parameterized queries (`?` placeholders) throughout, which is correct for SQL injection prevention.
- The DataLoader implementation correctly maintains key-order alignment, which is a common source of bugs.
- Creating a new DataLoader per request context (in the Apollo Server context function) is the correct pattern, as documented by the DataLoader library.
