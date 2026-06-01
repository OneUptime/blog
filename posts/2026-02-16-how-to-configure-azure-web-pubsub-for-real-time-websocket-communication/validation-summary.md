# Validation Summary: How to Configure Azure Web PubSub for Real-Time WebSocket Communication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Web PubSub
- Azure CLI
- Azure Monitor diagnostic settings
- Node.js
- JavaScript
- WebSocket
- `@azure/web-pubsub`
- `ws`

## Sources Consulted
- Microsoft Learn: Azure CLI `az webpubsub` reference: https://learn.microsoft.com/en-us/cli/azure/webpubsub?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az webpubsub hub` reference: https://learn.microsoft.com/en-us/cli/azure/webpubsub/hub?view=azure-cli-latest
- Microsoft Learn: `WebPubSubServiceClient` JavaScript API reference: https://learn.microsoft.com/en-us/javascript/api/%40azure/web-pubsub/webpubsubserviceclient?view=azure-node-latest
- Microsoft Learn: `WebPubSubGroup` JavaScript API reference: https://learn.microsoft.com/en-us/javascript/api/%40azure/web-pubsub/webpubsubgroup?view=azure-node-latest
- Microsoft Learn: Generate client access URL for Azure Web PubSub clients: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/howto-generate-client-access-url
- Microsoft Learn: Azure Web PubSub client protocols: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-client-protocols
- Microsoft Learn: Azure Web PubSub service internals: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-service-internals
- Microsoft Learn: Billing model for Azure Web PubSub service: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-billing-model
- Microsoft Learn: Azure Web PubSub service limits: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits#azure-web-pubsub-limits
- Microsoft Learn: Supported logs for `Microsoft.SignalRService/WebPubSub`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-signalrservice-webpubsub-logs
- Microsoft Learn: Azure Monitor diagnostic settings: https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings

## Issues Found
- The server SDK example used `getClientAccessUrl`, but the current JavaScript SDK documents `getClientAccessToken`. Updated the code and surrounding explanation while preserving the use of the returned `url` property.
- The client example was labeled as browser or Node.js code while using `require('ws')`, which is Node.js-specific. Updated the comment to identify it as a Node.js WebSocket client.
- The group example used `serviceClient.group('room-1').hasUser('user-123')`, but the current `WebPubSubGroup` API does not expose `hasUser`. Replaced it with the supported `serviceClient.groupExists('room-1')` check and adjusted the output text.
- The scaling section claimed Standard supports 100,000 concurrent connections per unit and 10 million per resource. Current Azure Web PubSub limits document 1,000 concurrent connections per Standard/Premium unit and up to 100 units for Standard/Premium_P1, so this was corrected to 100,000 concurrent connections per resource.
- The common pitfalls section described the event handler requirement as CORS. Azure Web PubSub event handler validation uses the `WebHook-Request-Origin` and `WebHook-Allowed-Origin` abuse-protection handshake, so the wording was corrected.

## Review Notes
The Azure CLI examples for creating a Web PubSub resource, retrieving keys, configuring hub event handlers, and creating Azure Monitor diagnostic settings are consistent with current Microsoft documentation. The local environment did not have `az` installed, so CLI verification was performed against Microsoft Learn command references rather than local `--help` output.
