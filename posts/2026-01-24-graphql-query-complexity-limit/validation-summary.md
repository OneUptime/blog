# Validation Summary: How to Fix 'Query Complexity' Limit Errors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GraphQL
- graphql-query-complexity
- Apollo Server
- Apollo Client
- TypeGraphQL
- graphql-depth-limit
- OpenTelemetry JavaScript API
- TypeScript / Node.js

## Sources Consulted
- graphql-query-complexity README and package source: https://github.com/slicknode/graphql-query-complexity
- graphql-query-complexity npm package metadata: https://www.npmjs.com/package/graphql-query-complexity
- GraphQL.js operation complexity controls: https://www.graphql-js.org/docs/operation-complexity-controls/
- Apollo Server plugin event reference: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- Apollo Server plugin creation docs: https://www.apollographql.com/docs/apollo-server/integrations/plugins
- Apollo Server constructor types from @apollo/server 5.5.1 package
- Apollo Client error handling docs: https://www.apollographql.com/docs/react/data/error-handling
- Apollo Client CombinedGraphQLErrors API docs: https://www.apollographql.com/docs/react/api/errors/CombinedGraphQLErrors
- TypeGraphQL query complexity docs: https://typegraphql.com/docs/complexity.html
- TypeGraphQL 2.0.0-rc.3 package typings
- graphql-depth-limit npm package: https://www.npmjs.com/package/graphql-depth-limit

## Issues Found
- The basic Apollo Server plugin imported `separateOperations` from `graphql` but did not use it. Removed the unused import.
- Apollo Server lifecycle hooks were shown as synchronous functions. Current Apollo Server plugin typings define `requestDidStart` and `didResolveOperation` as async lifecycle hooks returning promises, so the examples now use `async requestDidStart()` and `async didResolveOperation(...)`.
- The SDL directive example defined `@complexity` directives but did not show the required `directiveEstimator`. Added a small estimator configuration using `directiveEstimator({ name: 'complexity' })`, matching graphql-query-complexity's directive estimator API.
- The TypeGraphQL example used `@Arg` without importing it and declared `recommendations: User[] { ... }`, which is invalid TypeScript. Added the `Arg` import, added a `Post` import, and changed `recommendations` to a decorated method.
- The custom estimator used plain object literals indexed by a dynamic string, which fails under normal TypeScript checking without an index signature. Added `Record<string, number>` and `Record<string, string>` annotations.
- The custom estimator usage snippet called `fieldExtensionsEstimator()` and `simpleEstimator()` without importing them. Added the missing imports.
- The Apollo Client example used the older `ApolloError` / `graphQLErrors` pattern. Apollo Client 4 uses specific error classes such as `CombinedGraphQLErrors`, so the example now uses `CombinedGraphQLErrors.is(error)` and `error.errors`.
- The retry helper returned the full Apollo query result while the normal path returned `result.data`. Updated the retry helper to return `result.data` for consistency.
- The per-user complexity example referenced `GraphQLSchema`, `getComplexity`, estimators, `customEstimator`, and `QueryComplexityError` without imports. Added the missing imports.
- The per-user example comment said the code added response headers, but the code only stored values on the context. Updated the comment to describe storing complexity on context for debugging or response formatting.

## Review Notes
- The examples are framework snippets and still assume surrounding application objects such as `schema`, `client`, `db`, `searchService`, and generated GraphQL types exist.
- The `graphql-depth-limit` package API shown is accurate, but the package is old and lightly maintained. For new GraphQL.js projects, built-in or actively maintained depth/complexity controls should also be evaluated.
- Returning complexity values in HTTP headers remains a valid best practice, but Apollo Server requires explicit response-header handling, such as a `willSendResponse` hook, if teams want to implement that behavior.
