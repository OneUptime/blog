# Validation Summary: How to Handle Real-Time Updates with GraphQL

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- GraphQL subscriptions
- Apollo Server
- Apollo Client React
- WebSocket subscriptions with `graphql-ws`
- `graphql-subscriptions` PubSub and `withFilter`
- Redis PubSub with `graphql-redis-subscriptions` and `ioredis`
- Node.js, Express, React

## Sources Consulted
- Apollo Server subscriptions documentation: https://www.apollographql.com/docs/apollo-server/data/subscriptions
- Apollo Client subscriptions documentation: https://www.apollographql.com/docs/react/data/subscriptions
- Apollo Client `useSubscription` API reference: https://www.apollographql.com/docs/react/api/react/useSubscription
- Apollo Client `GraphQLWsLink` API reference: https://www.apollographql.com/docs/react/api/link/apollo-link-subscriptions
- Apollo Client `useQuery` documentation: https://www.apollographql.com/docs/react/data/queries
- `graphql-subscriptions` README: https://github.com/apollographql/graphql-subscriptions/blob/master/README.md
- `graphql-redis-subscriptions` README: https://github.com/davidyaha/graphql-redis-subscriptions

## Issues Found
- The server setup used `apollo-server-express`, `SubscriptionServer`, and `subscriptions-transport-ws`, while the client used `graphql-ws`. These libraries use different WebSocket subprotocols, and `subscriptions-transport-ws` is no longer actively maintained. Updated the server setup to `@apollo/server`, `expressMiddleware`, `ws`, and `graphql-ws/use/ws`.
- The Apollo Server example used `server.applyMiddleware`, which is an older Apollo Server integration pattern. Updated it to the current Express middleware setup and added HTTP/WebSocket drain handling.
- The schema snippet referenced `DateTime`, `JSON`, and `NotificationType` without defining them. Added scalar declarations and a `NotificationType` enum.
- `graphql-subscriptions` examples used `pubsub.asyncIterator`, which has been replaced by `asyncIterableIterator` in the current package documentation. Updated the in-memory PubSub examples.
- Apollo Client React examples imported hooks from `@apollo/client` and used older callback options such as `onSubscriptionData` and `onCompleted`. Updated imports to `@apollo/client/react`, replaced subscription handling with `onData`, and moved initial query state syncing into `useEffect`.
- The input example used React's deprecated `onKeyPress` event. Updated it to `onKeyDown`.
- The Redis PubSub snippet exported `EVENTS` without defining it and used `withFilter` without importing it. Added the missing definitions/import.
- The permission example used `ForbiddenError`, which is not the current Apollo Server v4/v5 style. Replaced it with `GraphQLError` plus a `FORBIDDEN` extension code.
- Standalone authentication and error-handling snippets still used `SubscriptionServer` patterns. Updated them to `graphql-ws` `useServer` patterns.

## Review Notes
- The examples remain illustrative and assume surrounding application code such as `typeDefs`, `resolvers`, `verifyToken`, `db`, and custom scalar resolver implementations.
- The default `PubSub` implementation remains appropriate only for demos or single-instance setups; the post correctly recommends Redis-backed PubSub for multi-server deployments.
