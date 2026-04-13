# Validation Summary: How to Use Subscriptions with MongoDB Change Streams in GraphQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Change Streams
- GraphQL Subscriptions
- Apollo Server 4 (with Express integration)
- graphql-ws (WebSocket transport)
- graphql-subscriptions (PubSub, withFilter)
- Mongoose ODM
- Apollo Client (useSubscription hook)
- React

## Sources Consulted
- Apollo Server 4 Subscriptions documentation: https://www.apollographql.com/docs/apollo-server/data/subscriptions
- Apollo Server expressMiddleware API reference: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- graphql-ws library documentation: https://github.com/enisdenjo/graphql-ws
- graphql-subscriptions asyncIterableIterator change: https://github.com/apollographql/graphql-subscriptions/pull/147
- MongoDB Change Events reference: https://www.mongodb.com/docs/manual/reference/change-events/
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- Apollo Client useSubscription API: https://www.apollographql.com/docs/react/api/react/useSubscription

## Issues Found
1. **Missing packages in npm install command**: The `express` and `graphql-subscriptions` packages were used in the code examples but not included in the `npm install` command. Added both to the install command.
2. **Deprecated `asyncIterator` method**: The `pubsub.asyncIterator()` method has been deprecated in `graphql-subscriptions` in favor of `pubsub.asyncIterableIterator()`, which returns a proper `AsyncIterable` and ensures correct event listener cleanup. Updated all three occurrences (in `postCreated`, `postUpdated`, and `postDeleted` subscription resolvers).

## Review Notes
- Apollo Server 4 reached end-of-life on January 26, 2026. Apollo Server 5 moves the Express integration to a separate package (`@as-integrations/express4`). The code in this post is still functional but targets an EOL version. A future update could migrate the examples to Apollo Server 5.
- The `PubSub` class from `graphql-subscriptions` is intended for development and testing only (in-memory, single-server). The post does not claim it is production-ready, which is appropriate, but a note about production alternatives (e.g., Redis-backed PubSub) could be a useful addition in the future.
- The client-side example does not show the WebSocket link setup required for Apollo Client to connect to the subscription endpoint (e.g., `GraphQLWsLink` from `@apollo/client/link/subscriptions`). This is acceptable since the post focuses on the server side, but could be expanded for completeness.
