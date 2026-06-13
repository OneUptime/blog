# Validation Summary: How to Implement GraphQL Subscriptions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GraphQL subscriptions
- Apollo Server
- Apollo Client for React
- graphql-ws
- graphql-subscriptions
- WebSocket
- Express
- Redis PubSub
- JSON Web Tokens
- Jest
- TypeScript

## Sources Consulted
- Apollo Server subscriptions documentation: https://www.apollographql.com/docs/apollo-server/data/subscriptions
- Apollo Server migration and Express integration documentation: https://www.apollographql.com/docs/apollo-server/migration
- Apollo Client subscriptions documentation: https://www.apollographql.com/docs/react/data/subscriptions
- Apollo Client useSubscription API documentation: https://www.apollographql.com/docs/react/api/react/useSubscription
- Apollo Client GraphQLWsLink API documentation: https://www.apollographql.com/docs/react/api/link/apollo-link-subscriptions
- graphql-ws recipes and API documentation: https://the-guild.dev/graphql/ws/recipes
- graphql-subscriptions README: https://github.com/apollographql/graphql-subscriptions/blob/master/README.md
- Current npm package metadata for @apollo/server, @apollo/client, graphql-ws, graphql-subscriptions, graphql-redis-subscriptions, ioredis, jsonwebtoken, react, and jest.

## Issues Found
- The setup command omitted packages used later in the server snippets. Added `@as-integrations/express5`, `graphql-tag`, `@graphql-tools/schema`, and `@types/cors`.
- The server imported `expressMiddleware` from `@apollo/server/express4`, which is not exported by current Apollo Server 5. Updated the install command and import to use `@as-integrations/express5`.
- The server imported `useServer` from the old `graphql-ws/lib/use/ws` path. Updated it to the current `graphql-ws/use/ws` export.
- The resolver examples used `pubsub.asyncIterator`, but current `graphql-subscriptions` uses `pubsub.asyncIterableIterator`. Updated all subscription resolver examples.
- The Apollo Client React component imported React hooks from `@apollo/client`, which is not the current Apollo Client 4 entry point. Updated hooks to import from `@apollo/client/react` and kept `gql` from `@apollo/client`.
- The React subscription example used the older `onSubscriptionData` option. Updated it to the current `onData` option.
- The React section overstated Apollo Client cache behavior by implying list updates happen automatically. Reworded the comment to explain that list appends require cache update logic or local state.
- The client, Redis, authentication, and Jest snippets referenced packages that were not installed. Added minimal install commands for those sections.
- The authentication update snippet expected `ctx.extra.user` to exist, but returned `{ user }` from `onConnect` instead of storing it there. Updated the snippet to assign the user to `ctx.extra`, return `true`, and include the `verifyToken` import.

## Review Notes
The examples are now aligned with current Apollo Server 5, Apollo Client 4, graphql-ws 6, and graphql-subscriptions 3 APIs. The test examples still assume a running local server and use timing-based waits, which is acceptable for a tutorial but should be replaced with explicit server setup and deterministic synchronization in production test suites.
