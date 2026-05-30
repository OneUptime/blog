# Validation Summary: How to Build WebSocket Applications with Azure Web PubSub and Express.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Web PubSub
- Azure CLI
- Azure Web PubSub JavaScript SDK
- Azure Web PubSub Express middleware
- Express.js
- Node.js
- TypeScript
- Browser WebSocket API
- Azure Web PubSub JSON WebSocket subprotocol

## Sources Consulted
- Azure Web PubSub JavaScript Express middleware overview: https://learn.microsoft.com/en-us/javascript/api/overview/azure/web-pubsub-express-readme?view=azure-node-latest
- Azure Web PubSub subprotocol tutorial: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/tutorial-subprotocol
- Azure Web PubSub service internals: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-service-internals
- Azure Web PubSub event handler configuration: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/howto-develop-eventhandler
- Azure Web PubSub client event notifications quickstart: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/quickstarts-event-notifications-from-clients
- Azure Web PubSub service limits: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits
- `@azure/web-pubsub` package type definitions, version 1.2.0: https://www.npmjs.com/package/@azure/web-pubsub
- `@azure/web-pubsub-express` package type definitions, version 1.0.6: https://www.npmjs.com/package/@azure/web-pubsub-express

## Issues Found
- Added `az extension add --upgrade --name webpubsub` before the Azure CLI commands. Microsoft documentation currently instructs users to install or upgrade the Web PubSub CLI extension before using `az webpubsub` commands.
- Added `@types/node` to the TypeScript development dependencies because the server example uses Node globals and modules such as `process`, `__dirname`, and `path`.
- Corrected the architecture diagram from "Broadcast to group" to "Broadcast to clients" because the main server example uses `serviceClient.sendToAll()`, not group broadcasting.
- Updated the client negotiation calls to use `encodeURIComponent(userId)` so user IDs containing spaces or reserved URL characters do not break the query string.
- Fixed the browser `onmessage` handler so it handles Azure Web PubSub JSON subprotocol messages correctly. Server broadcasts arrive as `type: "message"` with the application payload in `data`, so system chat messages sent by the server must be detected inside `msg.data`.
- Replaced the unsupported "event handler webhooks are delivered at least once" claim. The Azure Web PubSub internals documentation describes synchronous and asynchronous event behavior, including failed asynchronous event logging, but does not document an at-least-once guarantee for event handler webhooks.
- Fixed the reconnection example by adding `userId` as a function parameter and URL-encoding it before negotiation. The original snippet referenced `userId` without defining it in scope.

## Review Notes
- The Azure Web PubSub SDK APIs used in the server example, including `WebPubSubServiceClient`, `getClientAccessToken()`, `sendToAll()`, `group().addUser()`, `group().sendToAll()`, `WebPubSubEventHandler`, `handleUserEvent`, `onConnected`, `onDisconnected`, and `res.success()`, match the current JavaScript package documentation and type definitions.
- The event handler CLI syntax matches Microsoft documentation for `az webpubsub hub create` and `az webpubsub hub update`, but the Azure CLI was not installed in the local environment, so command verification used official Microsoft Learn documentation instead of local `az --help` output.
