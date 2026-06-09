# Validation Summary: How to Implement Real-time Features with GraphQL

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- GraphQL subscriptions
- Apollo Server v4 (`@apollo/server`, `@apollo/server/express4`)
- `graphql-ws` (WebSocket transport for GraphQL subscriptions)
- `graphql-subscriptions` (in-memory PubSub)
- `graphql-redis-subscriptions` + `ioredis` (Redis-backed PubSub for horizontal scaling)
- `@graphql-tools/schema` (`makeExecutableSchema`)
- Apollo Client v3 (`@apollo/client`, `GraphQLWsLink`, `useSubscription`, `useQuery`, `useMutation`)
- Express, `ws`, `cors`
- TypeScript, React
- JWT-based authentication (`jsonwebtoken`)

## Sources Consulted
- graphql-subscriptions README and changelog (v3.0.0 API change): https://github.com/apollographql/graphql-subscriptions
- graphql-ws "Get Started" and `useServer` API docs: https://the-guild.dev/graphql/ws/get-started and https://the-guild.dev/graphql/ws/docs/use/ws/functions/useServer
- graphql-ws `ClientOptions` (createClient): https://the-guild.dev/graphql/ws/docs/client/interfaces/ClientOptions
- Apollo Server v4 Express middleware docs: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- Apollo Client subscriptions / `GraphQLWsLink` docs: https://www.apollographql.com/docs/react/api/link/apollo-link-subscriptions
- Apollo Client `useSubscription` (`onData` callback): https://www.apollographql.com/docs/react/api/react/useSubscription
- graphql-redis-subscriptions README (constructor options): https://github.com/davidyaha/graphql-redis-subscriptions

## Issues Found

1. **Outdated `graphql-ws` import path.** The post used `import { useServer } from 'graphql-ws/lib/use/ws'`, which is the legacy v5.x path. As of graphql-ws v6+, the canonical path documented in "Get Started" is `'graphql-ws/use/ws'`. Updated `src/server.ts` import accordingly.

2. **Deprecated `pubsub.asyncIterator([...])` API.** In `graphql-subscriptions` v3.0.0 (Nov 2023), `asyncIterator` was deprecated in favor of `asyncIterableIterator`, which complies with the spec's `Symbol.asyncIterator` semantics. The new method also takes a single topic (or topic array) rather than requiring the array form. Updated all seven subscription resolvers (`messageReceived`, `messageEdited`, `messageDeleted`, `typingIndicator`, `userStatusChanged`, `notificationReceived`, `roomMembershipChanged`) to call `pubsub.asyncIterableIterator(EVENTS.X)`.

## Review Notes
- Apollo Server v4 patterns are used throughout. In Apollo Server v5 (2025), `expressMiddleware` was removed from the core package and moved to the separate `@as-integrations/express4` / `@as-integrations/express5` packages. The post is internally consistent on v4 — readers migrating to v5 will need that integration package.
- `useSubscription`'s `onData` callback receives `{ client, data }` where the payload sits at `data.data.<fieldName>`. The post uses this correctly (`data.data?.messageReceived`, etc.).
- `keepAlive` on the graphql-ws client is in milliseconds and disabled by default (0). The post sets `10000` (10s), which is reasonable.
- `NodeJS.Timeout` typing on `typingTimeoutRef` in browser code relies on `@types/node` being in scope. `ReturnType<typeof setTimeout>` would be more portable, but this is a stylistic preference, not an error.
- `RedisPubSub` requires *both* `publisher` and `subscriber` ioredis clients (cannot pass just one) — the post does this correctly.
- The post's `joinRoom` mutation publishes a payload containing both nested `room`/`roomId` fields; the subscription filter reads `payload.roomMembershipChanged.roomId`, which works because the published payload explicitly includes `roomId` at that level. This is fine but slightly redundant with the nested `room.id`.
