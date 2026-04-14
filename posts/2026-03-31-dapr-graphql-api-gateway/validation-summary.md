# Validation Summary: How to Build a GraphQL API Gateway with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, OAuth2 middleware, sidecar configuration)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Apollo Server v4 (`@apollo/server`)
- Express.js
- GraphQL
- DataLoader (request batching)
- Kubernetes (Deployment manifests)

## Sources Consulted
- Dapr JavaScript SDK documentation and API reference for `DaprClient`, `HttpMethod`, and `invoker.invoke()` method signatures
- Apollo Server v4 migration guide — `@apollo/server` replaces deprecated `apollo-server-express`
- Apollo Server v4 documentation for `expressMiddleware` integration with Express
- Kubernetes API reference for Deployment spec (required `selector` and pod template `labels` fields)
- Dapr middleware component reference for `middleware.http.oauth2clientcredentials` metadata field names
- Existing validated blog posts in this repository for cross-referencing Dapr and Apollo Server API patterns

## Issues Found

1. **Dapr SDK: string literals instead of `HttpMethod` enum** — All `invoker.invoke()` calls used plain strings `"GET"` and `"POST"` for the HTTP method parameter. The Dapr JS SDK requires the `HttpMethod` enum (e.g., `HttpMethod.GET`, `HttpMethod.POST`). Fixed by importing `HttpMethod` from `@dapr/dapr` and replacing all string literals with enum values.

2. **Apollo Server: deprecated v3 package and API** — The post imported from `apollo-server-express` (Apollo Server v3, end-of-life October 2023) and used the v3 API (`gql` tag export, `context` as constructor option, `server.applyMiddleware()`). Fixed by:
   - Changing imports to `@apollo/server` and `@apollo/server/express4`
   - Adding `cors` import (no longer bundled in v4)
   - Replacing `gql` tagged template with `#graphql` comment syntax (plain strings accepted by v4)
   - Moving `context` from `ApolloServer` constructor to `expressMiddleware` options
   - Replacing `server.applyMiddleware()` with `app.use()` + `expressMiddleware()`
   - Adding `cors()` and `express.json()` middleware before `expressMiddleware`

3. **Kubernetes Deployment YAML: missing required fields** — The Deployment spec was missing `spec.selector.matchLabels` and `spec.template.metadata.labels`, both of which are required by the Kubernetes API. Without these, the manifest would be rejected. Fixed by adding `selector.matchLabels` and `template.metadata.labels` with `app: graphql-gateway`.

4. **Dapr OAuth2 middleware: incorrect metadata field name** — The `clientID` field (capital D) should be `clientId` (camelCase with lowercase d) per the Dapr component specification. Fixed both the `name` and `secretKeyRef.key` values.

## Review Notes
- The Dapr OAuth2 middleware component is correctly defined but the post does not show the Dapr `Configuration` resource needed to attach the middleware to the HTTP pipeline. This is an incomplete example rather than a technical error.
- In Apollo Server v4, introspection is enabled by default in all environments (reversing the v3 behavior). The explicit `introspection: process.env.NODE_ENV !== "production"` guard is still valid and accepted, but readers should know the default changed.
