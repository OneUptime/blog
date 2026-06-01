# Validation Summary: How to Build a WebSocket Chat Application with Azure Web PubSub and React

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Web PubSub
- Azure CLI
- WebSocket
- Azure Web PubSub JavaScript server SDK
- Azure Web PubSub Express middleware
- React
- Node.js
- Express
- JavaScript

## Sources Consulted
- Azure CLI `az webpubsub` reference: https://learn.microsoft.com/en-us/cli/azure/webpubsub?view=azure-cli-latest
- Azure CLI `az webpubsub hub` reference: https://learn.microsoft.com/en-us/cli/azure/webpubsub/hub?view=azure-cli-latest
- Azure Web PubSub JavaScript SDK reference: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/reference-server-sdk-js
- `WebPubSubServiceClient` API reference: https://learn.microsoft.com/en-us/javascript/api/@azure/web-pubsub/webpubsubserviceclient?view=azure-node-latest
- `WebPubSubGroup` API reference: https://learn.microsoft.com/en-us/javascript/api/@azure/web-pubsub/webpubsubgroup?view=azure-node-latest
- Azure Web PubSub JSON WebSocket subprotocol reference: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/reference-json-webpubsub-subprotocol
- Azure Web PubSub OData filter syntax: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/reference-odata-filter
- Azure Web PubSub Express middleware reference: https://learn.microsoft.com/en-us/javascript/api/overview/azure/web-pubsub-express-readme?view=azure-node-latest
- Azure Web PubSub service internals: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-service-internals
- Azure Web PubSub billing model: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-billing-model
- Azure Web PubSub overview: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/overview

## Issues Found
- The access token example used `webpubsub.sendToServerEvent`, which is not a documented role for the JSON WebSocket subprotocol. Removed the role list because event requests to the upstream server do not require that role.
- Server-to-client sends passed stringified JSON without explicitly setting `contentType: 'text/plain'`. Updated the SDK calls to send text messages with the correct content type, matching the client-side parsing logic.
- Room changes added the connection to the new group but never removed it from the previous group. Added `removeConnection` when switching rooms.
- The OData filter interpolated `userId` directly. Added escaping for single quotes before using the value in the filter expression.
- The React login flow awaited a `connect()` function that returned before the WebSocket was open, so the initial `join_room` event could be dropped. Updated `connect()` to resolve on `onopen`.
- The negotiate request interpolated `userId` into the query string without URL encoding. Added `encodeURIComponent`.
- The Azure CLI event-handler example used a comma-separated `system-event` value. Updated it to repeat `system-event` according to the CLI reference.
- The security note incorrectly said the Express middleware performs signature validation automatically when given a connection string. Reworded it to describe CloudEvents webhook validation and `allowedEndpoints`.
- The scaling section incorrectly claimed 100,000 concurrent connections per Standard unit. Updated it to the documented 1,000 concurrent connections per unit and noted tier and regional limits.
- The summary claimed the sample could scale to hundreds of thousands of concurrent users without qualification. Reworded it to a less specific scale claim aligned with provisioned service capacity.

## Review Notes
The local environment did not have the Azure CLI installed, so CLI syntax was validated against Microsoft Learn rather than local `az --help` output. The tutorial remains an illustrative sample; production use should add authentication, durable message storage, input validation, and deployment-specific webhook authorization.
