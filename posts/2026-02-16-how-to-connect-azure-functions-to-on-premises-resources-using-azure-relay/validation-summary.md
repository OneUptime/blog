# Validation Summary: How to Connect Azure Functions to On-Premises Resources Using Azure Relay

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Functions
- Azure App Service Hybrid Connections
- Azure Relay Hybrid Connections
- Hybrid Connection Manager
- Node.js
- hyco-https
- axios
- node-mssql / SQL Server
- Shared Access Signature authentication

## Sources Consulted
- Microsoft Learn: Hybrid Connections in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/app-service-hybrid-connections
- Microsoft Learn: Azure Functions networking options - https://learn.microsoft.com/en-au/azure/azure-functions/functions-networking-options
- Microsoft Learn: Azure Relay Hybrid Connections protocol guide - https://learn.microsoft.com/en-us/azure/azure-relay/relay-hybrid-connections-protocol
- Microsoft Learn: Azure Relay Hybrid Connections HTTP requests in Node.js - https://learn.microsoft.com/en-us/azure/azure-relay/relay-hybrid-connections-http-requests-node-get-started
- Microsoft Learn: Relay Hybrid Connections Node.js API overview - https://learn.microsoft.com/en-us/azure/azure-relay/relay-hybrid-connections-node-ws-api-overview
- Microsoft Learn: Azure Relay authentication and authorization - https://learn.microsoft.com/azure/azure-relay/relay-authentication-and-authorization

## Issues Found
- The post described App Service Hybrid Connections as generally available to Azure Functions without noting the current Azure Functions limitation. Updated the text to state that the built-in Hybrid Connections feature applies to Windows function apps on supported plans, not Consumption plan or Linux function apps.
- The post stated that Hybrid Connection Manager runs on Windows only. Microsoft documentation now provides Windows and Linux HCM installation paths, so the post now says HCM can run on Windows or Linux.
- The `hyco-https` listener example imported `RelayedServer` and passed `server`/`path` options that match neither the Microsoft `hyco-https` HTTP sample nor the `hyco-ws` API shape. Updated the sample to use `require('hyco-https')`, `createRelayListenUri`, `createRelayedServer`, and `createRelayToken`.
- The function-side relay example manually generated a SAS token while describing the SDK approach. Updated it to use the official `hyco-https` helper methods for the relay HTTPS URI and token.
- The SQL Server example said `encrypt: false` was acceptable because encryption was handled by the relay. That is misleading because Relay does not replace SQL Server TLS for the database connection. Updated the sample to use `encrypt: true` and `trustServerCertificate: false`.

## Review Notes
The security guidance is directionally correct, but a production implementation should prefer Microsoft Entra ID where supported and use SAS keys only with tight rotation and least-privilege policies. Function apps using the built-in Hybrid Connections feature should also confirm hosting plan and OS support before implementation.
