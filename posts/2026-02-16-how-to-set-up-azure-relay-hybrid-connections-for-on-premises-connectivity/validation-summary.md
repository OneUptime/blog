# Validation Summary: How to Set Up Azure Relay Hybrid Connections for On-Premises Connectivity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Relay Hybrid Connections
- Azure CLI
- Azure Relay Shared Access Signatures
- Microsoft Entra ID authentication for Azure Relay
- Node.js
- hyco-https
- hyco-ws
- WebSockets

## Sources Consulted
- Azure Relay Hybrid Connections protocol guide: https://learn.microsoft.com/en-us/azure/azure-relay/relay-hybrid-connections-protocol
- Azure Relay Hybrid Connections HTTP requests in Node.js: https://learn.microsoft.com/en-us/azure/azure-relay/relay-hybrid-connections-http-requests-node-get-started
- Overview of the Azure Relay Node APIs: https://learn.microsoft.com/en-us/azure/azure-relay/relay-hybrid-connections-node-ws-api-overview
- Azure CLI `az relay hyco` reference: https://learn.microsoft.com/en-us/cli/azure/relay/hyco
- Azure CLI `az relay hyco authorization-rule` reference: https://learn.microsoft.com/en-us/cli/azure/relay/hyco/authorization-rule
- Azure CLI `az relay hyco authorization-rule keys` reference: https://learn.microsoft.com/en-us/cli/azure/relay/hyco/authorization-rule/keys
- Authenticate and authorize an application with Microsoft Entra ID to access Azure Relay entities: https://learn.microsoft.com/en-us/azure/azure-relay/authenticate-application
- Azure Relay FAQ quotas: https://learn.microsoft.com/en-us/azure/azure-relay/relay-faq
- hyco-https npm package source, version 1.4.5: https://www.npmjs.com/package/hyco-https
- hyco-ws npm package source, version 1.0.5: https://www.npmjs.com/package/hyco-ws

## Issues Found
- The HTTP listener example destructured `RelayedServer` from `hyco-https`, but the documented package API exposes `createRelayedServer`, `createRelayListenUri`, and `createRelayToken` directly on the `hyco-https` module. Updated the listener to use the documented helpers and pass a Relay listen URI as the server target.
- The sender example manually generated SAS tokens against the full request URL including the suffix path. The official Node helper signs the Relay Hybrid Connection endpoint URI, and the package normalizes the URI before signing. Updated the sender to use `hyco-https.createRelayHttpsUri` and `hyco-https.createRelayToken`.
- The reconnection fragment still used the same incorrect `RelayedServer` API name as the original listener. Updated it to use `hyco-https.createRelayedServer`.
- The WebSocket example imported `HybridConnectionsWebSocketServer`, which is not exported by `hyco-ws`, and omitted the values needed to create a listener token. Updated it to use `hyco-ws.createRelayedServer` with `createRelayListenUri` and `createRelayToken`.
- The performance section said the Standard plan supports up to 25 hybrid connections per namespace. Azure Relay documents 25 as the concurrent listener limit per relay entity, and 5,000 concurrent relay connections per namespace. Updated the wording to match the documented quotas.

## Review Notes
Azure CLI could not be checked with local `az --help` because Azure CLI is not installed in the review environment. Commands were verified against the official Azure CLI reference instead.
