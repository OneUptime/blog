# Validation Summary: How to Build a Real-Time Dashboard with Azure SignalR Service and Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SignalR Service
- Azure CLI
- Node.js
- TypeScript
- Express
- ASP.NET Core SignalR JavaScript client
- Azure SignalR Service REST API
- JWT authentication

## Sources Consulted
- Azure SignalR Service data-plane REST API reference: https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-reference-data-plane-rest-api
- Azure SignalR Service REST API v1 reference: https://learn.microsoft.com/en-us/azure/azure-signalr/swagger/signalr-data-plane-rest-v1
- Azure SignalR Service REST API v20220601 reference: https://learn.microsoft.com/en-us/azure/azure-signalr/swagger/signalr-data-plane-rest-v20220601
- Azure SignalR Service REST API quickstart: https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-quickstart-rest-api
- Azure SignalR Service connection strings: https://learn.microsoft.com/en-us/azure/azure-signalr/concept-connection-string
- Azure CLI `az signalr` reference: https://learn.microsoft.com/en-us/cli/azure/signalr
- Azure CLI `az signalr cors` reference: https://learn.microsoft.com/en-us/cli/azure/signalr/cors
- Azure SignalR Service scaling guidance: https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-howto-scale-signalr
- Azure SignalR Service messages and connections: https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-concept-messages-and-connections
- Node.js crypto API documentation: https://nodejs.org/api/crypto.html
- TypeScript module documentation: https://www.typescriptlang.org/docs/handbook/modules/reference.html

## Issues Found
- The REST broadcast URL used `/api/v1/hubs/{hub}/:send?api-version=2022-11-01`, which mixed the v20220601 `:send` route style with the stable v1 `/api/v1` route prefix. Changed the broadcast URL to `/api/v1/hubs/{hub}` and the group URL to `/api/v1/hubs/{hub}/groups/{group}`.
- The server REST API token used the client connection audience. Azure SignalR REST API authentication requires the JWT `aud` claim to match the HTTP request URL without query parameters or trailing slash. Changed token generation to accept an audience and pass the REST URL for server sends.
- The client token used `sub` for user identity. Azure SignalR Service documents `nameid` as the claim used to identify clients for user-related APIs. Changed the generated client identity claim to `nameid`.
- The Azure CLI setup did not configure CORS for the browser dashboard origin. Added `--allowed-origins http://localhost:3000` to the `az signalr create` command.
- The TypeScript example used default imports for CommonJS-style modules without showing a compatible TypeScript configuration. Changed imports to `import = require(...)` and added `@types/node` to the dev dependencies so the Node globals and built-in modules type-check.
- The wrap-up claimed serverless mode means you only pay for messages sent, not idle connections. Azure SignalR pricing is tier/unit based with message allowances and limits, so the claim was too broad. Reworded it to say the Node.js app does not keep persistent server connections open to SignalR Service.

## Review Notes
- The tutorial intentionally generates simulated metrics rather than collecting real system metrics; that is technically fine for a demo.
- The example manually creates Azure SignalR access tokens for clarity. For production code, managed identity or a maintained SDK/helper should be preferred where available, and access keys should be protected and rotated.
- The Azure CLI was not installed in the local review environment, so CLI command verification was performed against Microsoft Learn CLI documentation rather than local `az --help` output.
