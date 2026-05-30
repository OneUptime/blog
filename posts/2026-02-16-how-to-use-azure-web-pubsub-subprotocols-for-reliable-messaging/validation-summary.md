# Validation Summary: How to Use Azure Web PubSub Subprotocols for Reliable Messaging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Web PubSub
- Azure Web PubSub JSON WebSocket subprotocol
- Azure Web PubSub reliable JSON WebSocket subprotocol
- WebSocket
- JavaScript
- Node.js
- @azure/web-pubsub
- JSON

## Sources Consulted
- Microsoft Learn: Azure Web PubSub supported JSON WebSocket subprotocol `json.webpubsub.azure.v1` - https://learn.microsoft.com/en-us/azure/azure-web-pubsub/reference-json-webpubsub-subprotocol
- Microsoft Learn: Azure Web PubSub Reliable JSON WebSocket subprotocol `json.reliable.webpubsub.azure.v1` - https://learn.microsoft.com/en-us/azure/azure-web-pubsub/reference-json-reliable-webpubsub-subprotocol
- Microsoft Learn: How to generate client access URL for Azure Web PubSub clients - https://learn.microsoft.com/en-us/azure/azure-web-pubsub/howto-generate-client-access-url
- Microsoft Learn: JavaScript SDK for Azure Web PubSub - https://learn.microsoft.com/en-us/azure/azure-web-pubsub/reference-server-sdk-js

## Issues Found
- The server SDK example used `serviceClient.getClientAccessUrl(...)`, but the current JavaScript server SDK documentation uses `getClientAccessToken(...)` to generate a client access URL/token object. Updated the method name.
- The post described `ackId` as delivery confirmation. Azure Web PubSub documentation defines ack responses as the process result for a request containing an `ackId`; this confirms service acceptance or failure, not end-to-end delivery to every recipient. Updated the wording, comments, tracker output, and use-case bullets to say service/request confirmation.
- The post implied plain WebSocket clients are only passive receivers. Official docs state simple WebSocket clients can send messages, but those messages rely on server-side processing. Updated that explanation.
- The `binary` `dataType` explanation did not mention that binary data in the JSON protocol is base64-encoded. Updated the description.
- The post used "reliable messaging" wording for behavior that belongs to Azure Web PubSub's reliable subprotocol when discussing recovery from disconnects and message loss. Added a caveat pointing to `json.reliable.webpubsub.azure.v1` for end-to-end recovery scenarios.

## Review Notes
The protocol frame examples for `joinGroup`, `leaveGroup`, `sendToGroup`, `event`, `ack`, `message`, and `system` are consistent with the official Azure Web PubSub JSON subprotocol reference after the wording fixes. No terminal commands were present.
