# Validation Summary: How to Secure Azure Relay Hybrid Connections with Shared Access Signatures

## Status
validated

## Post Type
Tutorial / security guide

## Technologies Covered
- Azure Relay Hybrid Connections
- Shared Access Signatures
- Azure CLI and Azure REST API
- JavaScript / Node.js
- Python
- C#
- Azure SDK for JavaScript
- Microsoft Entra ID authentication
- Azure Relay IP firewall rules

## Sources Consulted
- Azure Relay authentication and authorization: https://learn.microsoft.com/en-us/azure/azure-relay/relay-authentication-and-authorization
- Authenticate and authorize an application with Microsoft Entra ID to access Azure Relay entities: https://learn.microsoft.com/en-us/azure/azure-relay/authenticate-application
- Azure Relay Hybrid Connections protocol guide: https://learn.microsoft.com/en-us/azure/azure-relay/relay-hybrid-connections-protocol
- Azure Relay Hybrid Connections WebSocket requests in Python: https://learn.microsoft.com/en-us/azure/azure-relay/relay-hybrid-connections-python-get-started
- Azure Relay Hybrid Connections HTTP requests in Node.js: https://learn.microsoft.com/en-us/azure/azure-relay/relay-hybrid-connections-http-requests-node-get-started
- Azure CLI `az relay hyco authorization-rule` reference: https://learn.microsoft.com/en-us/cli/azure/relay/hyco/authorization-rule
- Azure Relay REST API, Hybrid Connections regenerate keys: https://learn.microsoft.com/en-us/rest/api/relay/hybrid-connections/regenerate-keys
- Azure Relay REST API, namespace network rule sets: https://learn.microsoft.com/en-us/rest/api/relay/namespaces/create-or-update-network-rule-set
- Azure Relay JavaScript management SDK reference: https://learn.microsoft.com/en-us/javascript/api/overview/azure/arm-relay-readme

## Issues Found
- The introduction described SAS as the primary authentication mechanism for Azure Relay. Microsoft documentation now recommends Microsoft Entra ID when possible, so this was changed to describe SAS as one supported authentication mechanism.
- The SAS authentication section said every Azure Relay request must include a SAS token. Hybrid Connections can allow anonymous senders when client authorization is disabled, so the wording was narrowed to the SAS-secured pattern covered by the post.
- The Python and C# token examples used encoders that are less aligned with Azure Relay SAS examples. They were updated to percent-encode the resource URI, signature, and key name with `quote(..., safe='')` in Python and `Uri.EscapeDataString` in C#.
- The key rotation procedure mixed listener and sender applications even though the post recommends separate authorization rules. The procedure was corrected so each authorization rule is rotated independently.
- The JavaScript management SDK sample imported `RelayManagementClient`, but the current `@azure/arm-relay` documentation exposes `RelayAPI`. The import and client construction were updated.
- The IP firewall example used `az relay namespace network-rule-set update`, which is not present in the current Azure CLI Relay namespace command reference. It was replaced with an `az rest` call against the documented Azure Relay networkRuleSets REST endpoint, using the documented `ipMask` field.

## Review Notes
- Azure CLI was not installed in the local workspace, so CLI verification was performed against Microsoft Learn CLI reference pages rather than local `az --help` output.
- The post remains SAS-focused, but Microsoft documentation recommends Microsoft Entra ID in production where possible.
