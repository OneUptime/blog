# Validation Summary: How to Configure Apollo Federation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GraphQL
- Apollo Federation
- Apollo Server
- Apollo Gateway
- Apollo Subgraph
- Rover CLI
- Node.js
- JavaScript

## Sources Consulted
- Apollo Server docs: Implementing a Subgraph with Apollo Server - https://www.apollographql.com/docs/apollo-server/using-federation/apollo-subgraph-setup
- Apollo Server docs: Implementing a Gateway with Apollo Server - https://www.apollographql.com/docs/apollo-server/using-federation/apollo-gateway-setup
- Apollo Server docs: @apollo/gateway API Reference - https://www.apollographql.com/docs/apollo-server/using-federation/api/apollo-gateway
- Apollo GraphOS docs: Apollo Federation Directives - https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/reference/directives
- Apollo GraphOS docs: Publish Schemas to GraphOS using Rover - https://www.apollographql.com/docs/graphos/platform/schema-management/delivery/publishing/rover
- Apollo Rover docs: Rover subgraph Commands - https://www.apollographql.com/docs/rover/commands/subgraphs

## Issues Found
- The JavaScript examples used ESM `import` syntax and top-level `await`, but the setup commands did not enable ESM for `.js` files. Added `npm pkg set type=module` to the gateway and subgraph setup commands.
- The subgraph examples imported `gql` from `graphql-tag`, but the subgraph dependency install command did not install `graphql-tag`. Added `graphql-tag` to the subgraph install command.
- The `graphql-tag` imports used named import syntax. Updated them to the default `gql` import shown in Apollo's official examples.
- The subgraph SDL examples used Federation directives without opting into Federation 2 via `extend schema @link`. Added the required `@link` metadata and directive imports.
- The gateway example set `subscriptions: false` on `ApolloServer`. Removed this obsolete Apollo Server option from the gateway constructor example.
- The custom directive SDL mixed several directive examples in a way that redefined `Product` inconsistently and omitted required Federation 2 directive imports. Reworked the snippet into a coherent SDL example using `@shareable`, `@inaccessible`, `@override`, `@provides`, `@requires`, and `@external`.
- The error handling example used `crypto.randomUUID()` without importing `crypto`. Added an explicit `randomUUID` import from `node:crypto`.
- The dependency comments referred specifically to Apollo Server v4 while the install command installs the current package line. Generalized the comment to Apollo Server.

## Review Notes
Apollo's current docs recommend GraphOS Router for most production supergraphs, with the Node.js Apollo Gateway still supported for cases that require custom gateway code. The post's gateway-focused approach remains technically valid, but a future editorial update could mention GraphOS Router more prominently.
