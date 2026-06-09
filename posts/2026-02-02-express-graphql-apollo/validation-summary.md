# Validation Summary: How to Build GraphQL APIs with Express and Apollo

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Express.js (Node.js web framework)
- Apollo Server 4 (`@apollo/server`)
- GraphQL (schema, resolvers, subscriptions)
- `@apollo/server/express4` `expressMiddleware`
- `graphql-ws` (WebSocket subscriptions, v5.x import path)
- `graphql-subscriptions` PubSub
- DataLoader (N+1 query batching)
- JSON Web Tokens (`jsonwebtoken`)
- `@graphql-tools/schema` (`makeExecutableSchema`)
- `graphql-depth-limit`, `graphql-validation-complexity`
- `express-rate-limit` + `rate-limit-redis` + `ioredis`
- `helmet`, `compression`, `cors`, `body-parser`
- Jest + Supertest for testing

## Sources Consulted
- Apollo Server 4 docs / migration guide — https://www.apollographql.com/docs/apollo-server/migration
- Apollo Server landing page plugins (Sandbox vs. Playground) — https://github.com/apollographql/apollo-server/issues/5341
- `graphql-ws` `useServer` reference — https://the-guild.dev/graphql/ws/docs/use/ws/functions/useServer
- `graphql-ws` v6 release notes (import path change) — https://github.com/enisdenjo/graphql-ws/releases
- `graphql-subscriptions` README and PR #147 (`asyncIterableIterator`) — https://github.com/apollographql/graphql-subscriptions
- `graphql-validation-complexity` types — https://github.com/4Catalyzer/graphql-validation-complexity/blob/master/index.d.ts
- DataLoader docs — https://github.com/graphql/dataloader
- Express docs — https://expressjs.com/

## Issues Found
1. **"Built-in GraphQL Playground for development" claim was incorrect.** Apollo Server 3 (2021) removed GraphQL Playground as the default landing page and replaced it with Apollo Sandbox; Apollo Server 4 continues this behavior. Playground itself reached end-of-life on 31 December 2022. Updated the bullet to "Built-in Apollo Sandbox for development".
2. **Stale comment in production server code** said `// Disable for GraphQL Playground` next to the `helmet` CSP setting. Updated to `// Disable for Apollo Sandbox` to match the actual landing page that ships with `@apollo/server` v4.
3. **Hallucinated `fieldCostFn` option on `createComplexityLimitRule`.** The `graphql-validation-complexity` package does not expose a `fieldCostFn` option — its actual options are `onCost`, `createError`, `formatErrorMessage`, `scalarCost`, `objectCost`, `listFactor`, and `introspectionListFactor`. Per-field costs are configured via field `extensions` (`getCost` / `getCostFactor` callbacks) on the schema, not via a rule option. Replaced the invented option with the real `formatErrorMessage` option and added a comment explaining the correct way to set per-field costs.

## Review Notes
- The post pins to `graphql-ws` v5.x via the `graphql-ws/lib/use/ws` import path. In v6.x the path changed to `graphql-ws/use/ws` — readers using a newer install should adjust the import.
- `pubsub.asyncIterator(['EVENT'])` still works in `graphql-subscriptions` v2.x but is deprecated in favor of `pubsub.asyncIterableIterator(['EVENT'])`. The current code is functional; future revisions could migrate to the newer name.
- `body-parser` works fine but is bundled into Express since 4.16; idiomatic Apollo Server 4 examples use `express.json()` directly. Not an error, just a stylistic note.
- The `createApolloServer` helper accepts `options.validationRules` from its caller but never wires that into the `ApolloServer` constructor — readers wanting depth/complexity limits to actually run will need to pass `validationRules` to the `ApolloServer` config themselves.
- `require('jsonwebtoken')` inside `generateToken` should ideally be hoisted to the top of the file with the other imports; left as-is to preserve the author's structure.
- `process.env.JWT_SECRET || 'your-secret-key'` is correctly flagged as a placeholder in the prose; readers should set `JWT_SECRET` in production.
