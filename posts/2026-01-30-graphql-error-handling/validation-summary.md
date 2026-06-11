# Validation Summary: How to Create GraphQL Error Handling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GraphQL
- GraphQL over HTTP
- Node.js
- TypeScript
- Apollo Server
- Apollo Server plugins and error formatting
- Apollo Client React
- GraphQL subscriptions

## Sources Consulted
- GraphQL Specification, Response: https://spec.graphql.org/October2021/#sec-Response
- GraphQL over HTTP draft specification, Status Codes: https://graphql.github.io/graphql-over-http/draft/#sec-Status-Codes
- Apollo Server error handling documentation: https://www.apollographql.com/docs/apollo-server/data/errors
- Apollo Server plugin event reference: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- Apollo Server expressMiddleware API reference: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- Apollo Server subscriptions documentation: https://www.apollographql.com/docs/apollo-server/data/subscriptions
- Apollo Client React error handling documentation: https://www.apollographql.com/docs/react/data/error-handling
- graphql-subscriptions README: https://github.com/apollographql/graphql-subscriptions/blob/master/README.md

## Issues Found
- The post claimed that every GraphQL response returns HTTP 200. This was too broad. Updated the explanation and Mermaid diagram to distinguish successful GraphQL execution and field errors from malformed HTTP/request-level failures that can return 4xx or 5xx status codes.
- The variable sanitizer did not correctly redact mixed-case sensitive keys such as `apiKey` because it lowercased only the variable name, not the configured sensitive field. Updated the comparison to lowercase both sides.
- The variable sanitizer treated arrays as plain objects during recursion. Updated it to preserve arrays while recursively sanitizing nested values.
- The error logging plugin generic type did not accept the nullable `user` shape used by the later Apollo Server context example. Updated the generic constraint to allow `user` to be null.
- The subscription resolver referenced `AuthorizationError` and `InternalError` without importing them, and imported `withFilter` without using it. Updated the imports.
- The subscription resolver used `pubsub.asyncIterator`, while current `graphql-subscriptions` documentation uses `asyncIterableIterator`. Updated the snippet accordingly.
- The Apollo Client example used `ApolloError` and `graphQLErrors`, which are not the current Apollo Client error handling pattern. Updated it to use `CombinedGraphQLErrors.is` from `@apollo/client/errors` and added the missing `useState` import.

## Review Notes
- The server snippets are examples and still assume project-local types and helpers such as `Database`, `Context`, `CreateUserInput`, `UpdateUserInput`, `mockDb`, `getUserFromToken`, and `getDatabase`.
- Apollo Server's documentation recommends custom `GraphQLError` instances with `extensions` for many use cases. The custom `ApplicationError` pattern in this post is still technically valid because the formatter unwraps resolver errors and maps them to formatted GraphQL errors.
- Apollo Server subscriptions require a WebSocket transport such as `graphql-ws` in a complete app; the post's subscription resolver focuses only on resolver-level error handling.
