# Validation Summary: How to Build a GraphQL Subscription API with Azure Web PubSub and Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GraphQL subscriptions
- Apollo Server
- Node.js
- Express
- graphql-ws
- Azure Web PubSub
- Azure CLI
- Azure App Service

## Sources Consulted
- Azure Web PubSub service client library for JavaScript: https://learn.microsoft.com/en-us/javascript/api/overview/azure/web-pubsub-readme?view=azure-node-latest
- Azure Web PubSub client library for JavaScript: https://learn.microsoft.com/en-us/javascript/api/overview/azure/web-pubsub-client-readme?view=azure-node-latest
- Azure CLI `az webpubsub` reference: https://learn.microsoft.com/en-us/cli/azure/webpubsub?view=azure-cli-latest
- Azure Web PubSub billing model and unit limits: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-billing-model
- Apollo Server Express middleware API reference: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- graphql-ws package exports and current API surface: https://www.npmjs.com/package/graphql-ws
- npm package metadata for `@apollo/server`, `@as-integrations/express4`, `@azure/web-pubsub`, `@azure/web-pubsub-client`, `@graphql-tools/schema`, and `uuid`

## Issues Found
- The original architecture and adapter claimed Azure Web PubSub would deliver events across Node.js instances while only using a local `EventEmitter`. That would not work because publishing with the service SDK does not automatically invoke another process's local emitter. I changed the adapter so each Node.js instance connects with `@azure/web-pubsub-client`, joins a shared group, receives `group-message` events, and emits them into local GraphQL subscribers.
- The dependency list omitted `@graphql-tools/schema` even though the server code imports it. I added it to the install command.
- The dependency list included `@azure/web-pubsub-express`, but the tutorial did not use it. I replaced it with `@azure/web-pubsub-client`, which the corrected adapter needs.
- The tutorial used `@apollo/server/express4`, which is removed in Apollo Server 5. I changed the install command and import to the current `@as-integrations/express4` package.
- The tutorial listed Node.js 18+, but current Apollo Server 5 and `@as-integrations/express4` require Node.js 20+. I updated the prerequisite.
- The tutorial used `graphql-ws/lib/use/ws`, which is not exported by current `graphql-ws` v6. I updated it to `graphql-ws/use/ws`.
- The resolver imported `uuid` without installing it, and current `uuid` is ESM-only. I changed the example to use Node's built-in `crypto.randomUUID()`.
- The Apollo Express setup did not include CORS middleware even though the current Apollo docs call out CORS and body parsing as app responsibilities. I added `cors` to the install command and middleware chain.
- The shutdown plugin only disposed of the WebSocket server. I added Apollo's HTTP server drain plugin while keeping the `graphql-ws` cleanup hook.
- The scaling section claimed Standard tier supports 100,000 concurrent connections per unit. Current Azure documentation says each unit supports up to 1,000 concurrent connections, with up to 100 units per instance. I corrected the claim.
- The summary described Azure Web PubSub as handling the GraphQL clients' WebSocket connection state, but the code has clients connected to the Node.js GraphQL server. I corrected the wording to describe Azure Web PubSub as the cross-instance broker.

## Review Notes
The corrected tutorial still uses in-memory message storage for chat history, so history is per Node.js process. That is acceptable for the tutorial's subscription focus, but a production version should use shared durable storage for message history.
