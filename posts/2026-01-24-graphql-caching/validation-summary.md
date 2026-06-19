# Validation Summary: How to Handle Caching in GraphQL APIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GraphQL
- Apollo Server
- Apollo Client
- Apollo Server cache control
- Apollo response cache plugin
- Redis
- ioredis
- lru-cache
- GraphQL Tools schema directives
- DataLoader
- CDN caching
- Automatic persisted queries

## Sources Consulted
- Apollo Server caching documentation: https://www.apollographql.com/docs/apollo-server/performance/caching
- Apollo Server plugin event reference: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- Apollo Server automatic persisted queries documentation: https://www.apollographql.com/docs/apollo-server/performance/apq
- Apollo Server cache backend documentation: https://www.apollographql.com/docs/apollo-server/performance/cache-backends
- Apollo Client persisted queries documentation: https://www.apollographql.com/docs/react/data/persisted-queries
- GraphQL over HTTP documentation: https://graphql.org/learn/serving-over-http/
- GraphQL caching documentation: https://graphql.org/learn/caching/
- GraphQL Tools schema directives documentation: https://the-guild.dev/graphql/tools/docs/schema-directives
- DataLoader README: https://github.com/graphql/dataloader
- lru-cache package documentation: https://www.npmjs.com/package/lru-cache
- ioredis documentation: https://github.com/redis/ioredis

## Issues Found
- The custom Apollo response-cache plugin attempted to replace the response in `willSendResponse`, which runs after execution. Updated it to use `responseForOperation`, the Apollo Server lifecycle hook that can return a cached `GraphQLResponse` before execution.
- The custom Apollo response-cache plugin used `context` instead of Apollo Server v4/v5 `contextValue`, checked mutations by string matching, and checked the old response body shape. Updated the code to use `contextValue`, inspect the parsed operation, and handle `response.body.kind === 'single'`.
- The Redis example described ioredis as using connection pooling and used `KEYS` for invalidation. Updated the comment to retry settings and changed pattern deletion to `scanStream` to avoid blocking Redis on large keyspaces.
- The Redis `exists` wrapper returned Redis' numeric result instead of a boolean. Updated it to return `true` or `false`.
- Resolver cache checks used truthiness, which misses cached falsy values. Updated checks to compare against `null`.
- The Apollo `@cacheControl` SDL snippet omitted the required `CacheControlScope` enum and directive definition. Added both so the schema does not fail with an unknown directive error.
- The Apollo response-cache plugin example used outdated or incorrect option shapes, including reading user data directly from the function argument and overriding `generateCacheKey`. Updated it to use `requestContext.contextValue` and `extraCacheKeyData`.
- The persisted query example used `new KeyValueCache()`, but `KeyValueCache` is an interface, not a constructible cache backend. Replaced it with the current `KeyvAdapter` plus `@keyv/redis` pattern.
- The CDN GET middleware only handled requests with a `query` parameter, which misses automatic persisted query GET requests that can send only the hash. Updated the condition to apply to GET requests.

## Review Notes
The post is technically relevant and covers current GraphQL caching patterns. Some examples remain illustrative and omit production concerns such as authorization-aware cache invalidation, APQ Redis connection configuration, and CDN-specific cache key rules, but the corrected snippets now match the documented APIs and avoid the main correctness pitfalls.
