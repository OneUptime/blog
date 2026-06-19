# Validation Summary: How to Fix 'Schema Stitching' Errors in GraphQL

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- GraphQL
- GraphQL schema stitching
- GraphQL Tools (`@graphql-tools/stitch`, `@graphql-tools/wrap`, `@graphql-tools/load`, `@graphql-tools/delegate`)
- GraphQL Tools executors (`@graphql-tools/executor-http`, `@graphql-tools/executor-graphql-ws`)
- Apollo Server
- Express
- Node.js
- WebSocket subscriptions

## Sources Consulted
- GraphQL Tools schema stitching type merging documentation: https://the-guild.dev/graphql/stitching/docs/approaches/type-merging
- GraphQL Tools duplicate types documentation: https://the-guild.dev/graphql/stitching/docs/getting-started/duplicate-types
- GraphQL Tools remote subschemas and executors documentation: https://the-guild.dev/graphql/stitching/docs/getting-started/remote-subschemas
- GraphQL Tools renaming transforms documentation: https://the-guild.dev/graphql/stitching/docs/transforms/renaming
- GraphQL Tools filtering transforms documentation: https://the-guild.dev/graphql/stitching/docs/transforms/filtering
- GraphQL Tools schema directives documentation: https://the-guild.dev/graphql/tools/docs/schema-directives
- GraphQL Tools URL loader API documentation: https://the-guild.dev/graphql/tools/docs/api/loaders/url/src/classes/urlloader
- Apollo Server Express middleware documentation: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- npm package metadata and published TypeScript definitions for `@graphql-tools/wrap`, `@graphql-tools/executor-http`, `@graphql-tools/executor-graphql-ws`, `@apollo/server`, and `@as-integrations/express4`

## Issues Found
- The type merging example placed `canonical: true` on the subschema config. GraphQL Tools documents static canonical configuration under the relevant `merge` type config, so the snippet was corrected to put `canonical: true` under `merge.User`.
- The retry/fallback loader used `makeExecutableSchema` without importing it. Added the missing import from `@graphql-tools/schema`.
- The fallback schema example returned only a status field for optional services, which would leave gateway extensions referencing missing `Order` and `Review` types. Added minimal service-shaped fallback schemas for `orders` and `reviews`.
- The subscription executor example used `endpoint` for `buildGraphQLWSExecutor`, but the current published executor package expects `url`. Updated the WebSocket executor configuration.
- The subscription executor example attempted to build `connectionParams` from an `executorRequest` argument. The current `connectionParams` function does not receive that request object, so the snippet was changed to avoid a broken per-request access pattern.
- The complete Apollo Server example imported Express middleware from `@apollo/server/express4`. Apollo Server 5 removed that export and the official current documentation recommends the separate integration package, so the snippet now imports from `@as-integrations/express4`.
- The complete gateway example extended `Order.products` but did not provide a resolver or documented source field for it. Removed that unsupported extension field so the example only exposes relationships it resolves.

## Review Notes
The post is technically relevant and broadly accurate after fixes. Some examples remain illustrative and assume service schemas expose fields such as `user`, `product`, `order`, `ordersByUserId`, and review lookup fields; a production implementation should align those names with the actual subschema SDL and add integration tests for delegated cross-service queries.
