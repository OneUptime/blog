# Validation Summary: How to Build GraphQL Federation Implementation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- GraphQL
- Apollo Federation 2
- Apollo Server
- Apollo Gateway
- Apollo Router / GraphOS
- Rover CLI
- TypeScript
- DataLoader

## Sources Consulted
- Apollo Server documentation: Implementing a Subgraph with Apollo Server - https://www.apollographql.com/docs/apollo-server/using-federation/apollo-subgraph-setup
- Apollo Server documentation: Implementing a Gateway with Apollo Server - https://www.apollographql.com/docs/apollo-server/using-federation/apollo-gateway-setup
- Apollo Server documentation: @apollo/gateway API reference - https://www.apollographql.com/docs/apollo-server/using-federation/api/apollo-gateway
- Apollo Federation documentation: Federation directives - https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/reference/directives
- Apollo Federation documentation: Moving to Federation 2 - https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/reference/moving-to-federation-2
- Apollo Rover documentation: supergraph commands - https://www.apollographql.com/docs/rover/commands/supergraphs
- DataLoader documentation - https://github.com/graphql/dataloader

## Issues Found
- The subgraph install command omitted `graphql-tag`, even though the examples import `gql` from `graphql-tag`. Added `graphql-tag` to the install command.
- The reviews subgraph referenced a `Product` entity and the gateway configured a products subgraph, but the post did not define a products subgraph. Added a minimal Products subgraph with `Product @key(fields: "id")`, query fields, sample data, and `__resolveReference`.
- The architecture diagram showed the extension direction backwards. Updated it so the Reviews subgraph extends/contributes fields to Users and Products.
- The reviews subgraph used `@external` on key fields and imported `@external`. In Federation 2, key fields such as `id` do not need `@external` when another subgraph contributes fields to an entity. Removed the unnecessary `@external` usage and import.
- The gateway URLs used `/graphql`, while the standalone server examples return root URLs such as `http://localhost:4001`. Updated the development gateway URLs to use the root URLs.
- The gateway section did not include the required `@apollo/gateway` install command. Added a gateway dependency install command.
- The DataLoader example imported `dataloader` without showing how to install it and created the loader in module scope. Added the install command and clarified that production loaders should be created per request so their memoization cache is request-scoped.
- The production note referred to Apollo Studio. Updated it to current Apollo terminology: managed federation with GraphOS and Apollo Router, or static composition with Rover CLI.

## Review Notes
Validated the corrected Federation 2 SDL by composing the users, reviews, and products subgraph schemas with Apollo's composition library. Also checked the installed Rover CLI help output for `rover supergraph compose --config`.
