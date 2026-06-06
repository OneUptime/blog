# Validation Summary: How to Secure GraphQL APIs

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- GraphQL
- Apollo Server 4 (`@apollo/server`, `@apollo/server/express4`, `@apollo/server/plugin/disabled`)
- Express.js with `expressMiddleware`
- `jsonwebtoken` for JWT verification
- `@graphql-tools/utils` (`mapSchema`, `getDirective`, `MapperKind`)
- `graphql-depth-limit`
- `graphql-query-complexity` (`getComplexity`, `simpleEstimator`, `fieldExtensionsEstimator`)
- `ioredis` for Redis-backed rate limiting
- Zod for input validation
- `@apollo/utils.keyvadapter` + `keyv` for Apollo persisted-query caching
- `helmet`, `cors` for HTTP hardening

## Sources Consulted
- Apollo Server 4 documentation: https://www.apollographql.com/docs/apollo-server/
- Apollo Server v3 → v4 migration guide (error class removal): https://www.apollographql.com/docs/apollo-server/migration/#removed-graphql-errors
- Apollo Server error handling reference: https://www.apollographql.com/docs/apollo-server/data/errors
- Apollo Server plugin lifecycle: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- Automatic Persisted Queries docs: https://www.apollographql.com/docs/apollo-server/performance/apq
- `@graphql-tools/utils` schema directive docs: https://the-guild.dev/graphql/tools/docs/schema-directives
- `graphql-query-complexity` README: https://github.com/slicknode/graphql-query-complexity
- `graphql-depth-limit` README: https://github.com/stems/graphql-depth-limit
- `graphql-js` `GraphQLError` reference: https://graphql.org/graphql-js/error/
- Zod docs: https://zod.dev/

## Issues Found
1. **`AuthenticationError` / `ForbiddenError` used without being imported, and removed from Apollo Server 4.** The "Authentication Context" resolver example and the `authDirectiveTransformer` directive implementation both threw `AuthenticationError` / `ForbiddenError` without any import. These classes were part of Apollo Server 3's exports but were intentionally removed in Apollo Server 4 — the official migration guide tells users to throw `GraphQLError` with `extensions.code` instead. As written, the code would throw a `ReferenceError` at runtime. Fixed by importing `GraphQLError` from `graphql` and throwing it with `extensions: { code: 'UNAUTHENTICATED' }` / `{ code: 'FORBIDDEN' }`, which is the current Apollo-recommended pattern.

2. **Misleading comment on `ttl: null` in the APQ example.** The persisted-queries snippet labeled `ttl: null` with comments saying "Only allow persisted queries in production" and "Reject queries that aren't persisted". `ttl: null` in Apollo's `persistedQueries` option only disables cache expiration — APQ still happily accepts any new query the client sends, registers it by hash, and executes it. It does not enforce a closed allow-list. Rewrote the comments to describe what the setting actually does and added a one-line note pointing readers to the strict-allow-list plugin that follows (which does enforce closed enrollment).

## Review Notes
- Apollo Server 4 plugin hooks accept both `async () => ({...})` and `() => ({...})` styles for `requestDidStart`; the post uses both. Both are valid in v4 — the lifecycle hook may return either a value or a Promise.
- `ApolloServerPluginCacheControl` is imported in the APQ example but never used. Harmless, just dead code — left in place to avoid stylistic changes outside the scope of fixing technical errors.
- `secureTypeDefs`, `secureResolvers`, `createDataLoaders`, `schema`, `rateLimitPlugin`, and `strictPersistedQueriesPlugin` are referenced in the final composed example without being re-defined inline. These read as illustrative placeholders pulled from earlier sections, which is reasonable in a tutorial context.
- The custom depth-limit visitor counts every `Field` ancestor, which slightly diverges from `graphql-depth-limit`'s standard semantics (which discount the operation/root level). The post's text frames it as a custom alternative rather than a drop-in replacement, so this is fine as written.
- The `noIntrospection` validation rule only blocks `__schema` and `__type` — `__typename` is intentionally allowed, which matches common practice (it's necessary for unions/interfaces and not a meaningful information leak on its own).
- Mermaid diagrams (flowchart and sequenceDiagram) parse cleanly.
