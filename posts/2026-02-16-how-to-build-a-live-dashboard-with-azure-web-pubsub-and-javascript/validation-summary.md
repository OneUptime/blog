# Validation Summary: How to Build a Live Dashboard with Azure Web PubSub and JavaScript

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Web PubSub
- Azure Web PubSub JavaScript server SDK (`@azure/web-pubsub`)
- JavaScript
- Node.js
- Express
- WebSocket API
- HTML and CSS
- Canvas API

## Sources Consulted
- Microsoft Learn: WebPubSubServiceClient class for JavaScript: https://learn.microsoft.com/en-us/javascript/api/@azure/web-pubsub/webpubsubserviceclient?view=azure-node-latest
- Microsoft Learn: WebPubSubGroup interface for JavaScript: https://learn.microsoft.com/en-us/javascript/api/@azure/web-pubsub/webpubsubgroup?view=azure-node-latest
- Microsoft Learn: How to generate client access URL for Azure Web PubSub clients: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/howto-generate-client-access-url
- Microsoft Learn: Azure Web PubSub supported JSON WebSocket subprotocol: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/reference-json-webpubsub-subprotocol
- Microsoft Learn: WebSocket client protocols for Azure Web PubSub: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-client-protocols
- Microsoft Learn: Azure Web PubSub push messages from server quickstart: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/quickstarts-push-messages-from-server
- npm package metadata and TypeScript declarations for `@azure/web-pubsub` 1.2.0.

## Issues Found
- The backend sample used `serviceClient.getClientAccessUrl(...)`, which is not a method on the current JavaScript `WebPubSubServiceClient`. Changed it to `serviceClient.getClientAccessToken(...)`, which returns a response containing the client connection `url`.
- The server publishing examples passed `JSON.stringify(metrics)` to `sendToAll` while intending to send JSON. In the JavaScript SDK, JSON messages should be passed as JavaScript values; passing a string would serialize the string again and deliver a quoted JSON string to simple WebSocket clients. Changed both hub-wide and group publishing examples to pass `metrics` directly.

## Review Notes
The post uses a simple WebSocket client for the main dashboard, which is valid for receiving server-sent JSON payloads. The later group discussion correctly points to the `json.webpubsub.azure.v1` subprotocol for client-side group joins; a future expansion could show the exact `joinGroup` request and message envelope handling for subprotocol clients.
