# Validation Summary: How to Fix 'Subscription Connection' Errors

## Status
validated

## Post Type
Technical tutorial / debugging guide

## Technologies Covered
- GraphQL subscriptions
- WebSocket transport
- Apollo Server v4
- Apollo Client
- graphql-ws
- ws
- graphql-subscriptions
- graphql-redis-subscriptions
- ioredis
- Nginx WebSocket proxying

## Sources Consulted
- Apollo Server subscriptions documentation: https://www.apollographql.com/docs/apollo-server/data/subscriptions
- Apollo Client subscriptions documentation: https://www.apollographql.com/docs/react/data/subscriptions
- Apollo Client GraphQLWsLink documentation: https://www.apollographql.com/docs/react/api/link/apollo-link-subscriptions
- graphql-ws ClientOptions documentation: https://the-guild.dev/graphql/ws/docs/client/interfaces/ClientOptions
- graphql-ws ServerOptions documentation: https://the-guild.dev/graphql/ws/docs/server/interfaces/ServerOptions
- graphql-ws useServer documentation: https://the-guild.dev/graphql/ws/docs/use/ws/functions/useServer
- graphql-subscriptions README: https://github.com/apollographql/graphql-subscriptions
- graphql-redis-subscriptions README: https://github.com/davidyaha/graphql-redis-subscriptions
- ioredis README: https://github.com/redis/ioredis
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html

## Issues Found
- The final `graphql-ws` server example used `onSubscribe: (ctx, msg)` and read `msg.payload.operationName`. Current `graphql-ws` v6 ServerOptions documents `onSubscribe(ctx, id, payload)`, so the example would not compile or log correctly against the current API. Updated it to `onSubscribe: (ctx, id, payload)` and `payload.operationName`.
- The final `graphql-ws` server example used `onComplete: (ctx, msg)`. Current `graphql-ws` v6 documents `onComplete(ctx, id, payload)`. Updated the callback signature.
- A comment said throwing from `onConnect` rejects with close code `4400`. Current `graphql-ws` docs only specify that returning `false` from `onConnect` closes with `4403`, while throwing closes with the error message in the close reason. Updated the comment to avoid the incorrect close-code claim.

## Review Notes
- The Apollo Server v4 setup matches Apollo's documented pattern: Express middleware, shared `http.Server`, `ws` WebSocketServer, `graphql-ws/use/ws`, executable schema, and coordinated shutdown.
- `subscriptions-transport-ws` is correctly described as unmaintained/deprecated relative to `graphql-ws`.
- `graphql-subscriptions` examples use the current `asyncIterableIterator` API introduced in v3, and the in-memory PubSub production caveat is accurate.
- The `graphql-ws` client options shown (`connectionParams`, `connectionAckWaitTimeout`, `keepAlive`, `retryAttempts`, `retryWait`, `shouldRetry`, and event handlers) match current documentation.
- The Nginx proxy snippet includes the required WebSocket `Upgrade` and `Connection` headers and increased read/send timeouts. A production Nginx config can also use a `map` for `$connection_upgrade`, but the snippet is technically valid.
