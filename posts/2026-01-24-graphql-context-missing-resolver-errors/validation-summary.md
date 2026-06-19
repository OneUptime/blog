# Validation Summary: How to Fix 'Context Missing' Resolver Errors

## Status
validated

## Post Type
Tutorial / Debugging guide

## Technologies Covered
- GraphQL resolvers and context
- Apollo Server
- graphql-ws subscriptions
- WebSocket subscriptions
- TypeScript context typing
- Jest-style integration testing

## Sources Consulted
- Apollo Server documentation: Context and contextValue - https://www.apollographql.com/docs/apollo-server/data/context
- Apollo Server documentation: Plugin event reference - https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- Apollo Server documentation: Subscriptions - https://www.apollographql.com/docs/apollo-server/data/subscriptions
- Apollo Server documentation: Integration testing - https://www.apollographql.com/docs/apollo-server/testing/testing
- Apollo Server documentation: Migrating from Apollo Server 4 - https://www.apollographql.com/docs/apollo-server/migration
- graphql-ws documentation: Context interface - https://the-guild.dev/graphql/ws/docs/server/interfaces/Context
- graphql-ws documentation: useServer - https://the-guild.dev/graphql/ws/docs/use/ws/functions/useServer

## Issues Found
- The Apollo Server context examples used the old constructor-level `context` option from Apollo Server 2/3. Updated them to pass `context` through `startStandaloneServer`, matching current Apollo Server guidance that context is provided through the integration function.
- The async context example incorrectly claimed that returning a Promise from a context function is itself the problem. Updated the example to show the real issue: assigning an unresolved Promise to a context property because `await` was omitted inside the context function.
- The resolver examples used deprecated `apollo-server-errors` classes such as `AuthenticationError` and `ForbiddenError`. Replaced them with `GraphQLError` from `graphql` and Apollo-style extension codes.
- The Apollo plugin examples accessed `context` on request context objects. Updated them to use `contextValue`, which is the current Apollo Server field exposed to resolvers and plugins.
- The context validation plugin used the deprecated error class and assumed `context` existed. Updated it to use `GraphQLError` and optional chaining against `contextValue`.
- The testing example used deprecated `apollo-server-testing` and the old `apollo-server` package. Updated it to use `@apollo/server` and `server.executeOperation` with `contextValue`.
- The subscriptions example had an ambiguous `requireAuth` variable in `onConnect`, which conflicted with the later helper function name. Renamed it to `subscriptionsRequireAuth` to make the intended configuration flag clear.

## Review Notes
The article is now aligned with current Apollo Server 5 documentation. The examples remain illustrative snippets and still assume project-local helpers such as `verifyToken`, `getDbConnection`, `createContext`, `mockDb`, and schema definitions exist.
