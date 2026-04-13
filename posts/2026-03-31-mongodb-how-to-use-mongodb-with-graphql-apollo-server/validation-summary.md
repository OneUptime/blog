# Validation Summary: How to Use MongoDB with GraphQL (Apollo Server)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Node.js native driver)
- GraphQL
- Apollo Server v4
- TypeScript
- Node.js
- ts-node

## Sources Consulted
- Apollo Server v4 "Getting Started" documentation: https://www.apollographql.com/docs/apollo-server/getting-started
- Apollo Server v4 `startStandaloneServer` API reference: https://www.apollographql.com/docs/apollo-server/api/standalone
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB `ObjectId` reference: https://www.mongodb.com/docs/manual/reference/method/ObjectId/
- GraphQL SDL specification: https://spec.graphql.org/
- Node.js ESM / top-level await documentation: https://nodejs.org/api/esm.html

## Issues Found
1. **Top-level `await` in `src/index.ts` would fail at runtime.** The server startup code used `await` at the module top level (`const { url } = await startStandaloneServer(...)`), which requires ESM module configuration. Since the post uses `ts-node src/index.ts` without any ESM setup (no `"type": "module"` in `package.json`, no `tsconfig.json` with ESM module settings, no `--esm` flag on `ts-node`), this would throw a `SyntaxError: await is only valid in async functions` at runtime. **Fix:** Wrapped the server creation and startup in an `async function main()` and called it, which is the standard pattern used in most Apollo Server tutorials and works regardless of module system configuration.

## Review Notes
- The post correctly uses Apollo Server v4 APIs (`@apollo/server` and `@apollo/server/standalone`), not the deprecated Apollo Server v3 (`apollo-server`) package.
- The `_id` to `id` field mapping in resolvers is handled correctly, which is an important detail when using the native MongoDB driver with GraphQL.
- The recommendation to use DataLoader for production N+1 query prevention is sound advice.
- The post does not include a `tsconfig.json` setup step, which readers will need. A minimal config with `"target": "ES2020"`, `"module": "commonjs"`, and `"esModuleInterop": true` would be sufficient for the code as corrected. This is a completeness gap but not a technical error.
