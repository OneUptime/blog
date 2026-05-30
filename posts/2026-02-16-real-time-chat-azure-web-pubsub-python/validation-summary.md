# Validation Summary: How to Build a Real-Time Chat Application with Azure Web PubSub and Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Web PubSub
- Azure CLI
- Python
- Flask
- Azure Web PubSub Python service SDK
- WebSocket
- Azure Web PubSub JSON WebSocket subprotocol
- SQLite

## Sources Consulted
- Microsoft Learn: How to generate client access URL for Azure Web PubSub clients: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/howto-generate-client-access-url
- Microsoft Learn: Azure Web PubSub JSON WebSocket subprotocol: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/reference-json-webpubsub-subprotocol
- Microsoft Learn: WebSocket client protocols for Azure Web PubSub: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-client-protocols
- Microsoft Learn: Write an upstream server for Azure Web PubSub: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/howto-web-pubsub-write-upstream-server
- Microsoft Learn: Azure CLI az webpubsub hub reference: https://learn.microsoft.com/en-us/cli/azure/webpubsub/hub
- Microsoft Learn: Azure Web PubSub service client library for Python: https://learn.microsoft.com/en-us/python/api/overview/azure/messaging-webpubsubservice-readme
- Microsoft Learn: WebPubSubServiceClient class reference: https://learn.microsoft.com/en-us/python/api/azure-messaging-webpubsubservice/azure.messaging.webpubsubservice.webpubsubserviceclient
- Microsoft Learn: Azure Web PubSub billing model: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-billing-model
- Microsoft Learn: Azure subscription and service limits, Azure Web PubSub limits: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits

## Issues Found
- The server examples serialized dictionaries with `json.dumps()` while also sending `content_type="application/json"`. The Azure Web PubSub JSON subprotocol delivers JSON content as JSON data to subprotocol clients, so the examples now send Python dictionaries directly through the SDK.
- The JavaScript client always called `JSON.parse(msg.data)`, but `msg.data` can already be a JSON object for `dataType: "json"` messages. The handler now accepts either a string or object.
- The JavaScript `sendToGroup` request omitted `dataType` and sent the chat payload as a JSON-encoded string. It now uses `dataType: "json"` and sends an object payload, matching the documented subprotocol.
- The upstream section described forwarded "messages" too broadly. It now says "custom user events" and clarifies the `azure.webpubsub.user.message` branch as a custom event handler.
- The Azure CLI event handler example used a comma-separated `system-event` value. Microsoft examples repeat `system-event` for multiple events, so the command now follows that documented form.
- The scaling section incorrectly said the Standard tier supports up to 100K concurrent connections per unit. Current documentation says each Standard/Premium unit supports up to 1,000 concurrent connections, and Standard/Premium_P1 instances support up to 100 units.
- The post said the Python server stays stateless, but the sample tracks users in memory and later adds SQLite persistence. The wording now says the server can stay stateless if state and history are stored externally.

## Review Notes
The examples remain simplified for a tutorial. A production implementation should validate upstream signatures, avoid storing the Web PubSub connection string in source code, add input validation, escape or render chat content safely on the client, and use an external store for user presence and message history when scaling horizontally.
