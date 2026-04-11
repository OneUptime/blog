# Validation Summary: How to Cache GraphQL Schema Introspection with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (node-redis v4+)
- GraphQL (graphql-js v16+)
- Apollo Server v4 (`@apollo/server`)
- Node.js (crypto module)

## Sources Consulted
- Apollo Server v4 plugin API source code and types (`@apollo/server` — `GraphQLRequestListener`, `responseForOperation`, `willSendResponse`, `HeaderMap`)
- node-redis v4+ source code and documentation (`createClient`, `connect`, `get`, `setEx`, `exists`)
- graphql-js v16+ source code and exports (`graphql`, `getIntrospectionQuery`, `printSchema`)

## Issues Found

1. **Incorrect `HeaderMap` usage in Apollo Server plugin** — The `responseForOperation` hook used `new Map([['x-cache', 'HIT']])` for response headers. Apollo Server v4 requires `HeaderMap` from `@apollo/server`, which extends `Map` with case-insensitive key handling for HTTP headers. Fixed by importing `HeaderMap` from `@apollo/server` and using `new HeaderMap()` with `.set()`.

2. **Missing `printSchema` import** — In the "Versioning the Cache Key" section, `printSchema(schema)` was called without importing it. Added `const { printSchema } = require('graphql');` to the code snippet.

## Review Notes
- The `redis-cli keys` command in the "Manual Invalidation" section is correct but should be used with caution in production, as `KEYS` blocks the Redis server while scanning all keys. `SCAN` is the production-safe alternative. This is a best-practice consideration, not a technical error.
- The `redis.exists()` call returns a number (0 or 1), not a boolean. The code uses `!isCached` which works correctly due to JavaScript truthiness rules (`!0` is `true`), but a numeric comparison like `=== 0` would be more explicit.
- The introspection detection heuristic (`request.query?.includes('__schema')`) is a reasonable approximation but could match non-introspection queries that reference `__schema` in comments or strings. This is a design trade-off, not an error.
