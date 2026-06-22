# Validation Summary: How to Integrate Redis with GraphQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- GraphQL
- Apollo Server
- Express
- DataLoader
- ioredis
- GraphQL Tools schema directives
- Apollo persisted queries
- GraphQL subscriptions
- graphql-ws
- graphql-redis-subscriptions

## Sources Consulted
- Apollo Server Express middleware API: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- Apollo Server migration guide for Express integrations: https://www.apollographql.com/docs/apollo-server/migration
- Apollo Server plugin event reference: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- Apollo Server cache backend documentation: https://www.apollographql.com/docs/apollo-server/performance/cache-backends
- Apollo Server automatic persisted queries documentation: https://www.apollographql.com/docs/apollo-server/performance/apq
- Apollo Server subscriptions documentation: https://www.apollographql.com/docs/apollo-server/data/subscriptions
- GraphQL Tools schema directives documentation: https://the-guild.dev/graphql/tools/docs/schema-directives
- graphql-ws recipes and useServer documentation: https://the-guild.dev/graphql/ws/recipes
- DataLoader documentation: https://github.com/graphql/dataloader
- ioredis documentation: https://github.com/redis/ioredis
- graphql-redis-subscriptions documentation: https://github.com/davidyaha/graphql-redis-subscriptions
- graphql-subscriptions documentation: https://github.com/apollographql/graphql-subscriptions

## Issues Found
- The installation command omitted packages required by later examples, including the Apollo Express integration, Express, GraphQL Tools utilities, Keyv Redis cache packages, WebSocket packages, and subscription packages. Updated the command to include the required dependencies.
- The Apollo Express example used `@apollo/server/express4`, which is not the current Apollo Server 5 integration path. Updated it to `@as-integrations/express4` and included the package in the installation command.
- The `Context` interface was imported by the resolver example but not exported from the server example. Exported the interface so the import is valid.
- The generic DataLoader helper accepted mutable `string[]` keys, while DataLoader batch functions receive readonly key arrays. Updated the helper type to accept `readonly string[]`.
- The cache directive declared support for object-level directives but only implemented field-level directive lookup. Updated the transformer to collect type-level directives and apply them to fields, matching the `type User @cacheControl(...)` example.
- The custom response cache plugin checked Redis in `requestDidStart` and replaced the response in `willSendResponse`, which would not avoid resolver execution on cache hits. Updated it to use Apollo Server's `responseForOperation` lifecycle hook so cached query responses can be returned before execution.
- The response cache key did not include `operationName`, which could collide for multi-operation documents. Added `request.operationName` to the key parts.
- The persisted query example manually mutated `request.query` in a plugin and threw a generic error. Replaced it with Apollo Server's supported automatic persisted query configuration using a Redis-backed `KeyvAdapter`.
- The GraphQL WebSocket import used `graphql-ws/lib/use/ws`, while current documentation uses `graphql-ws/use/ws`. Updated the import path.

## Review Notes
- The examples are still illustrative and assume application-specific model methods such as `User.findMany` and `Post.create` exist.
- ioredis remains usable for these examples, but its own documentation notes that node-redis is the recommended client for new projects.
