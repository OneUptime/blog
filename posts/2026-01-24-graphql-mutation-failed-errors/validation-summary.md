# Validation Summary: How to Fix 'Mutation Failed' Errors in GraphQL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- GraphQL mutations and validation
- Apollo Server
- Apollo Client React hooks
- GraphQL.js errors
- Sequelize transactions and row locking
- Joi validation
- Node.js

## Sources Consulted
- GraphQL Specification, October 2021: https://spec.graphql.org/October2021/
- Apollo Server error handling documentation: https://www.apollographql.com/docs/apollo-server/data/errors
- Apollo Server migration documentation: https://www.apollographql.com/docs/apollo-server/migration
- Apollo Server plugin event reference: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- Apollo Client error handling documentation: https://www.apollographql.com/docs/react/data/error-handling
- Apollo Client mutations documentation: https://www.apollographql.com/docs/react/data/mutations
- Sequelize transactions documentation: https://sequelize.org/docs/v6/other-topics/transactions/
- Joi documentation: https://joi.dev/

## Issues Found
- The server examples used Apollo Server 2/3 APIs from the end-of-life `apollo-server` package, including `ApolloError`, `UserInputError`, `AuthenticationError`, and `ForbiddenError`. Updated the examples to use current Apollo Server style with `@apollo/server` and `GraphQLError` from `graphql`, setting custom error codes through `extensions.code`.
- The production `formatError` example used the older one-argument style and returned an `ApolloError`. Updated it to the current two-argument `formatError(formattedError, error)` signature and to return formatted error objects.
- The Apollo Server context example was placed in the `ApolloServer` constructor, which is not correct for the standalone Apollo Server integration. Moved context creation into `startStandaloneServer`.
- The Apollo Client example used older `error.graphQLErrors` / `error.networkError` handling and omitted the `gql` import. Updated it to import `CombinedGraphQLErrors`, read GraphQL errors from `error.errors`, and import `gql`.
- The validation helper emitted `BAD_USER_INPUT` while the client example mapped field-level validation details under `VALIDATION_ERROR`. Updated the helper to emit `VALIDATION_ERROR` for those structured validation failures.
- A stale comment still referenced `UserInputError` after the error handling update. Changed it to `GraphQLError`.

## Review Notes
The examples are intentionally illustrative and still assume application-specific helpers such as `db`, `verifyToken`, `createDataLoaders`, and `isValidEmail`. The Sequelize transaction pattern, Joi validation approach, GraphQL non-null input explanation, and Apollo plugin lifecycle example align with the consulted official documentation.
