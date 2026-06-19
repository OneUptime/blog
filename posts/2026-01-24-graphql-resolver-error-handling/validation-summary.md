# Validation Summary: How to Handle Error Handling in GraphQL Resolvers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GraphQL
- GraphQL resolvers
- Node.js
- Apollo Server
- Apollo Client
- JavaScript
- React
- Mermaid diagrams

## Sources Consulted
- GraphQL response documentation: https://graphql.org/learn/response/
- GraphQL over HTTP draft specification: https://github.com/graphql/graphql-over-http/blob/main/spec/GraphQLOverHTTP.md
- Apollo Server error handling documentation: https://www.apollographql.com/docs/apollo-server/data/errors
- Apollo Client error handling documentation: https://www.apollographql.com/docs/react/data/error-handling

## Issues Found
- The post stated that GraphQL always returns HTTP 200. This was too absolute. I changed it to explain that resolver execution errors commonly use HTTP 200 with an `errors` response body, while malformed requests, validation failures, authentication failures, and server errors can use non-200 statuses depending on server behavior and GraphQL-over-HTTP media type.
- The response diagram showed complete failures only as `data: null`. I changed it to `data: null or omitted` because request errors can omit `data`, while execution failures can return `data: null`.
- The custom error class extended plain `Error` and stored `code` only as a custom property. I updated it to extend the `graphql` package's `GraphQLError` and set `extensions.code` and `extensions.http.status`, matching current Apollo Server guidance for custom GraphQL errors.
- The Apollo Server `formatError` example used `error.originalError || error` to recover resolver errors. I updated it to use `unwrapResolverError` from `@apollo/server/errors`, which Apollo documents for accessing the originally thrown resolver error.
- The schema example returned a `ForbiddenError` object in resolver code but did not define a `ForbiddenError` GraphQL type. I added the missing type definition.
- The async handler snippet referenced `GraphQLError` and `InternalError` without importing them. I added the missing import.
- The Apollo Client React example used `error.graphQLErrors`, which is outdated for current Apollo Client documentation. I updated it to use `CombinedGraphQLErrors.is(error)` and read from `error.errors`.

## Review Notes
The post is now technically accurate for modern Apollo Server and Apollo Client usage. One caveat is that setting HTTP status codes from resolver-thrown errors is supported by Apollo Server but not generally recommended for normal resolver errors; GraphQL clients should primarily use schema data and `errors[].extensions.code` for application-level handling.
