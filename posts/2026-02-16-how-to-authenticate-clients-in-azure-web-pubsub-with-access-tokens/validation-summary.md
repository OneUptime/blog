# Validation Summary: How to Authenticate Clients in Azure Web PubSub with Access Tokens

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Web PubSub
- JavaScript
- Node.js
- Express
- WebSocket
- JWT access tokens
- Microsoft Entra ID

## Sources Consulted
- Microsoft Learn: How to generate client access URL for Azure Web PubSub clients - https://learn.microsoft.com/en-us/azure/azure-web-pubsub/howto-generate-client-access-url
- Microsoft Learn: Azure Web PubSub service client library for JavaScript - https://learn.microsoft.com/en-us/javascript/api/overview/azure/web-pubsub-readme
- Microsoft Learn: WebPubSubServiceClient class - https://learn.microsoft.com/en-us/javascript/api/@azure/web-pubsub/webpubsubserviceclient
- Microsoft Learn: WebSocket client protocols for Azure Web PubSub - https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-client-protocols
- Microsoft Learn: Azure Web PubSub service internals - https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-service-internals
- Microsoft Learn: Azure Web PubSub CloudEvents handlers for Express - https://learn.microsoft.com/en-us/javascript/api/overview/azure/web-pubsub-express-readme
- Microsoft Learn: Web Pub Sub - Generate Client Token REST API - https://learn.microsoft.com/en-us/rest/api/webpubsub/dataplane/web-pub-sub/generate-client-token
- Microsoft Learn: Use wildcard group role patterns - https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-wildcard-group-roles
- Microsoft Learn: Authorize access to Web PubSub resources using Microsoft Entra ID - https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-azure-ad-authorization

## Issues Found
- The JavaScript examples used `serviceClient.getClientAccessUrl()`, but the current `@azure/web-pubsub` service SDK documents `getClientAccessToken()`. Updated all server-side token generation examples to use `getClientAccessToken()`.
- The post said the Web PubSub service signs and verifies client JWTs. Updated this to clarify that the application server signs tokens using the SDK and Web PubSub verifies them on connect.
- The role list omitted current wildcard group role patterns. Added `webpubsub.joinLeaveGroups.<pattern>` and `webpubsub.sendToGroups.<pattern>`.
- The expiration section claimed a fixed default, a 24-hour maximum, and automatic termination of existing WebSocket connections when a token expires. Reworded it to the documented behavior: the token lifetime is controlled by `expirationTimeInMinutes`, expired tokens are not accepted for connection, and reconnects need a fresh access URL.
- The reconnect helper used `this` inside a standalone function. Updated it to accept the client object explicitly.
- The connect-event sample read `userId` and `connectionId` directly from `req.body`, but Azure Web PubSub sends upstream events as CloudEvents and the official Express helper exposes these values through `req.context`. Replaced the raw Express route with `@azure/web-pubsub-express` and `WebPubSubEventHandler`.
- Updated Azure Active Directory naming to Microsoft Entra ID and removed the stale middleware example reference.

## Review Notes
The raw `WebSocket` client examples are intentionally minimal. For production JavaScript clients, the official `@azure/web-pubsub-client` package provides automatic reconnect behavior and group rejoin handling that would be preferable for larger applications.
