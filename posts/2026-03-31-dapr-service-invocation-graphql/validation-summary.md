# Validation Summary: How to Use Dapr Service Invocation with GraphQL Endpoints

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation API)
- GraphQL (queries, mutations, variables)
- Apollo Server v4 (`@apollo/server`, `@apollo/server/express4`)
- Express.js
- Node.js Dapr SDK (`@dapr/dapr`)
- cURL

## Sources Consulted
- Apollo Server v4 API Reference: expressMiddleware — https://www.apollographql.com/docs/apollo-server/api/express-middleware
- Apollo Server v4 API Reference: ApolloServer — https://www.apollographql.com/docs/apollo-server/api/apollo-server
- Apollo Server v3 to v4 Migration Guide — https://www.apollographql.com/docs/apollo-server/migration
- graphql-tag package (source of `gql`) — https://github.com/apollographql/graphql-tag
- Dapr Service Invocation API Reference — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr How-To: Invoke Services Using HTTP — https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- Dapr JavaScript Client SDK — https://docs.dapr.io/developing-applications/sdks/js/js-client/
- GraphQL: Serving over HTTP — https://graphql.org/learn/serving-over-http/
- GraphQL over HTTP Specification — https://graphql.github.io/graphql-over-http/draft/

## Issues Found

### 1. `gql` incorrectly imported from `@apollo/server`
- **What was wrong:** The post imported `gql` from `@apollo/server` (`const { ApolloServer, gql } = require('@apollo/server')`). In Apollo Server v4, `gql` is no longer exported from this package.
- **What was changed:** Moved `gql` import to a separate `require('graphql-tag')` statement, which is the correct source for the `gql` tagged template literal in Apollo Server v4.
- **Why:** Code would throw an import error at runtime since `gql` is not an export of `@apollo/server`.

### 2. Missing ApolloServer instantiation and `server.start()` call
- **What was wrong:** The code referenced a `server` variable in `expressMiddleware(server)` but never created an `ApolloServer` instance. Additionally, Apollo Server v4 requires `await server.start()` before passing the server to `expressMiddleware`.
- **What was changed:** Added `const server = new ApolloServer({ typeDefs });` and wrapped the Express setup in an async `start()` function that calls `await server.start()` before mounting the middleware.
- **Why:** Without these, the code would crash with a `ReferenceError` for the undefined `server` variable, and even if it were defined, Apollo Server v4 throws if `start()` is not called before using `expressMiddleware`.

### 3. Missing `HttpMethod` import in Dapr SDK example
- **What was wrong:** The code used `HttpMethod.POST` but only imported `DaprClient` from `@dapr/dapr`.
- **What was changed:** Updated the import to `const { DaprClient, HttpMethod } = require('@dapr/dapr');`.
- **Why:** `HttpMethod` is a separate named export from the `@dapr/dapr` package and must be explicitly imported.

## Review Notes
- The Dapr service invocation URL pattern, GraphQL over HTTP conventions (query/variables JSON body), and Dapr Node.js SDK `invoker.invoke()` method signature are all correct.
- The post does not include resolvers in the Apollo Server example, which means the schema alone won't return meaningful data. This is acceptable for a tutorial focused on the Dapr invocation pattern rather than GraphQL server implementation, but readers should be aware they need to add resolvers for a working service.
- The `expressMiddleware` function in Apollo Server v4 also accepts a `context` option for request-scoped context; this is not shown but is not needed for the post's scope.
