# Validation Summary: How to Set Up Azure Private Endpoint for Azure Event Hubs

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Event Hubs
- Azure Private Endpoint / Azure Private Link
- Azure Private DNS
- Azure Virtual Network subnet configuration
- Azure CLI
- Azure Monitor diagnostic settings
- Azure Event Hubs SDK for Python

## Sources Consulted
- Azure Event Hubs private endpoints: https://learn.microsoft.com/en-us/azure/event-hubs/private-link-service
- Azure Private Endpoint DNS zone values: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Azure Private Endpoint overview: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview
- Azure CLI `az eventhubs namespace`: https://learn.microsoft.com/en-us/cli/azure/eventhubs/namespace
- Azure CLI `az eventhubs eventhub`: https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub
- Azure CLI `az eventhubs namespace network-rule-set`: https://learn.microsoft.com/en-us/cli/azure/eventhubs/namespace/network-rule-set
- Azure CLI `az network vnet subnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Azure CLI `az network private-endpoint`: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Azure CLI `az network private-endpoint dns-zone-group`: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Azure Monitor data reference for Event Hubs: https://learn.microsoft.com/en-us/azure/event-hubs/monitor-event-hubs-reference
- Azure Event Hubs SDK for Python: https://learn.microsoft.com/en-us/python/api/overview/azure/eventhub-readme

## Issues Found
- The Event Hub creation command used `--message-retention 7`, which is not the current Azure CLI option. Replaced it with `--retention-time 168`, because the CLI expects event retention in hours.
- The private endpoint subnet section said the disable-network-policies flag allows the subnet to host private endpoints. Updated the command to the current `--private-endpoint-network-policies Disabled` option and clarified that disabling policies is the default/simple hosting configuration, while NSG/UDR behavior requires explicitly enabled private endpoint network policies.
- The monitoring example omitted the documented Event Hubs VNet/IP connection log category. Added `EventHubVNetConnectionEvent` to better match the section's goal of tracking private endpoint and network-filtered access.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against the current Microsoft Learn CLI reference instead of local `az --help` output. The Python examples use current `azure-eventhub` SDK patterns and are suitable as basic connectivity tests.
