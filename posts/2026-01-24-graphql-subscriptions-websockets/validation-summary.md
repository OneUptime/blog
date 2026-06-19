# Validation Summary: How to Configure GraphQL Subscriptions with WebSockets

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- GraphQL subscriptions
- WebSockets
- Apollo Server
- Apollo Client
- graphql-ws
- graphql-subscriptions
- Node.js and Express
- Redis PubSub with ioredis

## Sources Consulted
- Apollo Server subscriptions documentation: https://www.apollographql.com/docs/apollo-server/data/subscriptions
- Apollo Server Express middleware documentation: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- graphql-ws ServerOptions documentation: https://the-guild.dev/graphql/ws/docs/server/interfaces/ServerOptions
- graphql-ws recipes: https://the-guild.dev/graphql/ws/recipes
- graphql-ws ClientOptions documentation: https://the-guild.dev/graphql/ws/docs/client/interfaces/ClientOptions
- Apollo Client subscriptions documentation: https://www.apollographql.com/docs/react/data/subscriptions
- Apollo Client GraphQLWsLink documentation: https://www.apollographql.com/docs/react/api/link/apollo-link-subscriptions
- Apollo Client useSubscription documentation: https://www.apollographql.com/docs/react/api/react/useSubscription
- graphql-subscriptions README and v3.0.0 package contents: https://github.com/apollographql/graphql-subscriptions/blob/master/README.md
- npm package metadata for @apollo/server, graphql-ws, graphql-subscriptions, and @as-integrations/express5

## Issues Found
- The install command omitted `graphql-subscriptions`, even though the basic server imports `PubSub` from that package. Added it to the install command.
- The Apollo Server Express import used `@apollo/server/express4`, which is no longer the current Apollo Server 5 integration path. Updated it to `@as-integrations/express5` and added that package to the install command.
- The Express middleware example did not configure CORS, which Apollo's Express middleware documentation expects the application to provide. Added `cors`, installed it, imported it, and applied it before `express.json()`.
- The `graphql-ws` server import used the older `graphql-ws/lib/use/ws` path. Updated it to the current public export, `graphql-ws/use/ws`.
- The `graphql-subscriptions` examples used the removed v2 `pubsub.asyncIterator` API. Updated them to `pubsub.asyncIterableIterator`, which is the v3 API.
- The authentication example assumed returning `{ user }` from `onConnect` made `ctx.extra.user` available. In current `graphql-ws`, a record returned from `onConnect` is sent as the connection acknowledgement payload. Updated the example to store `ctx.extra.user` explicitly and added a `context` function for resolvers.
- The `onSubscribe` examples used an outdated callback shape, reading `msg.payload.operationName`. Updated them to the current `(ctx, id, payload)` signature and read `payload.operationName`.
- The monitoring example replaced `ctx.extra`, which can discard adapter-provided data. Updated it to assign `ctx.extra.connectionId`.
- The React example imported unused `useEffect` and assigned unused subscription data. Removed the unused import and variable.
- The React cache update assumed subscription data and cached query data always existed. Added guards before reading the new message and writing the cache.

## Review Notes
The remaining examples are illustrative snippets rather than a single complete application. The Redis and JWT examples import additional packages (`graphql-redis-subscriptions`, `ioredis`, and `jsonwebtoken`) that should be installed in projects using those optional sections.
