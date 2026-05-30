# Validation Summary: How to Set Up Azure OpenAI Service with Private Endpoints for Network Isolation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure OpenAI Service
- Azure Private Endpoint / Private Link
- Azure Virtual Network and VNet peering
- Azure Private DNS
- Azure CLI
- OpenAI Python SDK for Azure OpenAI
- Azure OpenAI REST chat completions API

## Sources Consulted
- Microsoft Learn: Configure Azure OpenAI networking - https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/network
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Manage network policies for private endpoints - https://learn.microsoft.com/en-us/azure/private-link/disable-private-endpoint-network-policy
- Microsoft Learn: Azure OpenAI REST API reference - https://learn.microsoft.com/en-us/azure/ai-services/openai/reference
- Microsoft Learn: Azure OpenAI API lifecycle - https://learn.microsoft.com/en-us/azure/ai-services/openai/api-version-lifecycle
- Microsoft Learn: Azure OpenAI Python migration examples - https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/migration
- Microsoft Learn: Azure CLI private endpoint commands - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Microsoft Learn: Azure CLI private endpoint DNS zone group commands - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Microsoft Learn: Azure CLI Cognitive Services network-rule commands - https://learn.microsoft.com/en-us/cli/azure/cognitiveservices/account/network-rule

## Issues Found
- The post stated that private endpoint network policies must be disabled as a prerequisite and described them as disabling NSG rules. Current Azure documentation says private endpoint network policies are disabled by default, and NSG/UDR support can be enabled for private endpoints. Updated the wording to explain when disabling is relevant and corrected the troubleshooting note.
- The REST and Python examples used Azure OpenAI API version `2024-06-01`. Microsoft documentation lists `2024-10-21` as the current GA date-versioned inference API replacing `2024-06-01`, so both examples were updated to `2024-10-21`.
- The cross-region section implied that the Azure OpenAI resource itself is in an "OpenAI VNet". Azure OpenAI resources are not deployed into customer VNets; the private endpoint is. Updated the wording to refer to peering between the application VNet and the VNet containing the private endpoint.

## Review Notes
The Azure OpenAI v1 API is now generally available and removes the need for date-based `api-version` parameters for supported paths. The post remains technically valid using the date-versioned `2024-10-21` API, but a future refresh could modernize the examples to the v1 API style.
