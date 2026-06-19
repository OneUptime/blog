# Validation Summary: How to Configure GraphQL Persisted Queries

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- GraphQL persisted queries and automatic persisted queries
- Apollo Client
- Apollo Server
- Apollo Rover CLI
- Keyv / Redis cache adapters
- Cloudflare Workers Cache API
- Nginx proxy caching
- React / TypeScript

## Sources Consulted
- Apollo Server automatic persisted queries documentation: https://www.apollographql.com/docs/apollo-server/performance/apq
- Apollo Client persisted queries documentation: https://www.apollographql.com/docs/react/data/persisted-queries
- Apollo Client PersistedQueryLink API reference: https://www.apollographql.com/docs/react/api/link/apollo-link-persisted-queries
- Apollo Server cache backends documentation: https://www.apollographql.com/docs/apollo-server/performance/cache-backends
- Apollo Rover persisted-queries command documentation: https://www.apollographql.com/docs/rover/commands/persisted-queries
- Apollo Router safelisting with persisted queries documentation: https://www.apollographql.com/docs/graphos/routing/security/persisted-queries
- Keyv Redis adapter documentation: https://keyv.org/docs/storage-adapters/redis/
- Cloudflare Workers Cache API documentation: https://developers.cloudflare.com/workers/runtime-apis/cache/

## Issues Found
- The APQ sequence diagram used a generic `hash` request field and a non-standard `extensions.persistedQuery.registered` response. Updated it to use Apollo's `extensions.persistedQuery.sha256Hash` request format and normal query responses.
- The benefits diagram claimed persisted queries provide faster parsing through pre-parsed queries. Apollo APQ caches the query string by hash; pre-parsed execution is not guaranteed. Updated this to "Smaller Requests" and "Short Operation IDs."
- The Apollo Server Redis cache example used an outdated direct Redis URI pattern. Updated it to use `createKeyv` from `@keyv/redis` with Apollo's `KeyvAdapter`.
- The strict persisted query example expected `operations` to be an object keyed by hash. Apollo persisted query manifests use an `operations` array with each operation's `id`. Updated the lookup map accordingly.
- The custom cache implementation was missing the `delete` method from the `KeyValueCache` interface. Added it.
- The comment on `allowBatchedHttpRequests: false` incorrectly said it rejected non-persisted queries. Updated the comment to say it disables HTTP batching.
- The generated manifest shape did not match Apollo's persisted query manifest format. Updated it to include `format: "apollo-persisted-query-manifest"` and an `operations` array with `id`, `name`, `type`, and `body`.
- The custom extractor printed only the operation definition, which drops fragment definitions and can generate invalid persisted operations. Updated it to include fragments from the same document.
- The Rover command used a non-existent `--graph-ref` option. Updated it to pass the graph ref as the positional argument.
- The Rover section described publishing as extraction. Renamed the subsection and command comment to publishing.
- The Cloudflare Worker used `event.waitUntil` without passing `event` into the handler, left an unused cache key string, and modified a fetched response without wrapping it first. Updated the handler to pass the event, use a stable `Request` cache key, preserve response status, and wrap responses before setting headers.
- The React hook example used `gql` without importing it and did not constrain `TVariables` to Apollo's `OperationVariables`. Updated the imports and generic constraint.
- The APQ retry example destructured `operation.extensions` without guarding against `undefined`. Added a fallback object.

## Review Notes
- Apollo Client's `PersistedQueryLink` already retries on `PersistedQueryNotFound` by default, so the custom retry link should usually be unnecessary.
- For GraphOS persisted query lists, prefer `@apollo/generate-persisted-query-manifest` so generated hashes match Apollo Client's runtime behavior, especially when document transforms such as `__typename` insertion or top-level definition sorting are involved.
