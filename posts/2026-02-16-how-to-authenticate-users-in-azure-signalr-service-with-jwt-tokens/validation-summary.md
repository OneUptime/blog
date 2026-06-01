# Validation Summary: How to Authenticate Users in Azure SignalR Service with JWT Tokens

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure SignalR Service
- ASP.NET Core SignalR
- JWT bearer authentication
- Azure Functions
- App Service Authentication / Easy Auth
- JavaScript and TypeScript SignalR clients

## Sources Consulted
- Microsoft Learn: Authentication and authorization in ASP.NET Core SignalR - https://learn.microsoft.com/aspnet/core/signalr/authn-and-authz
- Microsoft Learn: ASP.NET Core SignalR configuration - https://learn.microsoft.com/aspnet/core/signalr/configuration
- Microsoft Learn: Manage users and groups in SignalR - https://learn.microsoft.com/aspnet/core/signalr/groups
- Microsoft Learn: Service mode in Azure SignalR Service - https://learn.microsoft.com/azure/azure-signalr/concept-service-mode
- Microsoft Learn: Client negotiation in Azure SignalR Service - https://learn.microsoft.com/azure/azure-signalr/signalr-concept-client-negotiation
- Microsoft Learn: Azure Functions SignalR Service input binding - https://learn.microsoft.com/azure/azure-functions/functions-bindings-signalr-service-input
- Microsoft Learn: Authentication with Azure Functions and Azure SignalR Service - https://learn.microsoft.com/azure/azure-signalr/signalr-tutorial-authenticate-azure-functions
- Microsoft Learn: Azure SignalR Service data-plane REST API reference - https://learn.microsoft.com/azure/azure-signalr/signalr-reference-data-plane-rest-api

## Issues Found
- The Serverless mode JWT validation sample used a `signalRConnectionInfo` binding with `userId: "{userId}"`, implying the binding could read a local variable computed inside the function handler. Azure Functions SignalR binding expressions can bind from HTTP request data such as headers or query parameters, but not from handler-local variables. I changed the sample to validate the JWT first and then generate the Azure SignalR negotiation response with a user-identifying `nameid` claim.
- The Serverless mode JWT validation sample referenced an undefined `validateToken` helper. I added a concrete JWKS-based validation helper using `jsonwebtoken` and `jwks-rsa`, with issuer and audience validation placeholders matching the rest of the post.
- The token expiration section said a WebSocket connection persists after token expiration as an unconditional statement. ASP.NET Core SignalR defaults to that behavior, but `CloseOnAuthenticationExpiration` can close connections when authentication expires. I updated the wording to call out the default and the option.

## Review Notes
- The post remains technically valid as a guide, but the Azure Functions custom JWT example still uses access-key based token generation for brevity. For production, Microsoft recommends Microsoft Entra ID or managed identity where possible, and the post's existing best practices around token handling should be followed.
