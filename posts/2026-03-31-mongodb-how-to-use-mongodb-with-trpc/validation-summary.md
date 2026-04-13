# Validation Summary: How to Use MongoDB with tRPC

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Node.js native driver)
- tRPC (v11)
- TypeScript
- Zod (input validation)
- Node.js

## Sources Consulted
- tRPC official docs — Define Routers: https://trpc.io/docs/server/routers
- tRPC official docs — Standalone Adapter: https://trpc.io/docs/server/adapters/standalone
- tRPC official docs — Vanilla Client Setup: https://trpc.io/docs/client/vanilla/setup
- tRPC official docs — httpBatchLink: https://trpc.io/docs/client/links/httpBatchLink
- tRPC official docs — Quickstart: https://trpc.io/docs/quickstart
- tRPC official docs — Migrate from v10 to v11: https://trpc.io/docs/migrate-from-v10-to-v11
- MongoDB Node.js driver documentation: https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
- **Missing `@trpc/client` in npm install command**: The original install command (`npm install @trpc/server mongodb zod`) omitted the `@trpc/client` package, which is required for the client code shown later in the post. The client imports `createTRPCClient` and `httpBatchLink` from `@trpc/client`, which is a separate npm package. Fixed by adding `@trpc/client` to the install command.

## Review Notes
- The post implicitly targets tRPC v11. The nested router shorthand syntax (plain objects instead of `t.router()` wrappers) and the `createTRPCClient` function name (renamed from `createTRPCProxyClient` in v10) are v11-specific features. This is fine but worth noting: the code will not work with tRPC v10.
- The `initTRPC.create()`, `createHTTPServer` from `@trpc/server/adapters/standalone`, Zod input validation, and `.query()`/`.mutate()` calling conventions are all correct and current.
- The MongoDB connection pattern using a singleton `getDb()` function with the native driver is a standard and correct approach.
