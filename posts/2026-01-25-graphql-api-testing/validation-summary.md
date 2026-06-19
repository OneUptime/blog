# Validation Summary: How to Implement GraphQL API Testing

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- GraphQL
- Apollo Server
- TypeScript
- Jest
- graphql-ws
- ws
- GraphQL.js schema utilities
- GitHub Actions
- Node.js

## Sources Consulted
- Apollo Server Integration Testing: https://www.apollographql.com/docs/apollo-server/testing/testing
- Apollo Server API Reference: https://www.apollographql.com/docs/apollo-server/api/apollo-server
- Apollo Server Subscriptions: https://www.apollographql.com/docs/apollo-server/data/subscriptions
- graphql-ws Recipes: https://the-guild.dev/graphql/ws/recipes
- GraphQL.js Utilities: https://www.graphql-js.org/api-v16/utilities/
- Jest CLI Options: https://jestjs.io/docs/cli
- GitHub Actions setup-node: https://github.com/actions/setup-node
- GitHub Actions checkout: https://github.com/actions/checkout
- Node.js Previous Releases: https://nodejs.org/en/about/previous-releases

## Issues Found
- The mutation test imported `createTestContext` from `./test-server`, but the setup snippet defines it in `./test-context`. Changed the import to use `./test-context`.
- The subscription test used the older `graphql-ws/lib/use/ws` import path. Updated it to the current `graphql-ws/use/ws` export shown in the official graphql-ws recipes.
- The subscription test instantiated `new WebSocket.Server` while using an ES named import from `ws`. Updated the snippet to import and instantiate `WebSocketServer`, matching current `ws` usage in graphql-ws documentation.
- The subscription server did not dispose the cleanup object returned by `useServer`. Captured the cleanup handle and disposed it in `afterAll`.
- The schema test imported `printSchema` but did not use it. Removed the unused import so the snippet is cleaner for TypeScript projects with unused import checks.
- The N+1 test imported `createTestContext` even though the snippet did not use it. Removed the unused import.
- The CI example used Node.js 20, which is EOL as of June 19, 2026. Updated the example to Node.js 22, a supported LTS release.
- The CI example used Jest's deprecated singular `--testPathPattern` option. Updated it to `--testPathPatterns`, which is the current Jest 30 CLI option.

## Review Notes
The examples are illustrative and still assume project-specific helpers such as `MockUserAPI`, `MockProductAPI`, `mockDatabase`, `triggerOrderStatusChange`, and `sendNotification` exist in the reader's test harness. The GraphQL schema comparison example also assumes `typeDefs` is an SDL string compatible with `buildSchema`; projects exporting a `DocumentNode` or executable schema should adapt that setup.
