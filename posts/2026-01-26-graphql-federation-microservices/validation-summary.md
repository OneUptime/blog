# Validation Summary: How to Use GraphQL Federation for Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GraphQL
- Apollo Federation 2
- Apollo Server
- Apollo Gateway
- Apollo Subgraph
- DataLoader
- JavaScript / Node.js
- Express
- Mermaid diagrams

## Sources Consulted
- Apollo Federation directives reference: https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/reference/directives
- Apollo Gateway API reference: https://www.apollographql.com/docs/apollo-server/using-federation/api/apollo-gateway
- Apollo Server gateway setup guide: https://www.apollographql.com/docs/apollo-server/using-federation/apollo-gateway-setup
- Apollo Server `startStandaloneServer` API reference: https://www.apollographql.com/docs/apollo-server/api/standalone
- Apollo Server usage reporting plugin reference: https://www.apollographql.com/docs/apollo-server/api/plugin/usage-reporting
- Apollo GraphOS Router subscription support docs: https://www.apollographql.com/docs/graphos/routing/operations/subscriptions/overview

## Issues Found
- Removed the stale `subscriptions: false` option from the Apollo Server gateway example. Current `@apollo/server` examples do not configure subscriptions with that constructor option, and Apollo's Router documentation now covers federated subscription support separately.
- Updated the production gateway composition comment from older "Apollo Studio managed federation" terminology to GraphOS-managed composition or a precomposed supergraph SDL.
- Added the missing `GraphQLError` import to the error handling example so the snippet is syntactically complete.
- Moved the DataLoader `context` example from the `ApolloServer` constructor to `startStandaloneServer`, which is where Apollo Server v4/v5 standalone integrations accept the context initialization function.
- Changed the gateway integration test snippet from `gateway.executeOperation` to `server.executeOperation`, because `executeOperation` is an Apollo Server method, not an ApolloGateway method.

## Review Notes
The Federation 2 subgraph SDL, `@link` directive usage, entity keys, `@external` fields, `buildSubgraphSchema` usage, `ApolloGateway` with `IntrospectAndCompose`, DataLoader batching pattern, usage reporting plugin options, and `_entities` reference test pattern were checked against official Apollo documentation and a temporary install of the current Apollo packages.
