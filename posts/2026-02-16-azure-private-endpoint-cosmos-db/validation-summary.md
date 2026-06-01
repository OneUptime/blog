# Validation Summary: How to Set Up Azure Private Endpoint for Azure Cosmos DB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cosmos DB
- Azure Private Endpoint
- Azure Private Link
- Azure Private DNS
- Azure Virtual Network and subnet network policies
- Azure CLI
- Azure Cosmos DB .NET SDK v3

## Sources Consulted
- Microsoft Learn: Configure Azure Private Link for an Azure Cosmos DB account - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-configure-private-endpoints
- Microsoft Learn: Azure Private Endpoint DNS configuration - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: az network private-endpoint CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Microsoft Learn: az network vnet subnet CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Microsoft Learn: az cosmosdb CLI reference - https://learn.microsoft.com/en-us/cli/azure/cosmosdb
- Microsoft Learn: Configure IP firewall for Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-configure-firewall
- Microsoft Learn: Azure Cosmos DB .NET SDK v3 connection configuration - https://learn.microsoft.com/en-us/azure/cosmos-db/tune-connection-configurations-net-sdk-v3
- Microsoft Learn: Azure Cosmos DB SQL SDK connectivity modes - https://learn.microsoft.com/en-us/azure/cosmos-db/sdk-connection-modes
- Microsoft Learn: Manage network policies for private endpoints - https://learn.microsoft.com/en-us/azure/private-link/disable-private-endpoint-network-policy

## Issues Found
- The subnet network policy explanation said the private endpoint subnet must have `privateEndpointNetworkPolicies` disabled and implied NSGs/UDRs would otherwise accidentally interfere. Current Azure documentation says private endpoint network policies are disabled by default, and NSG/UDR support can be enabled intentionally for private endpoints. I changed the wording to match the Azure Cosmos DB CLI example while noting that NSG/route table support requires enabling private endpoint network policies intentionally.
- The multi-region section implied that every Cosmos DB replica region requires its own private endpoint and that DNS automatically sends each application region to its local private endpoint. Azure Cosmos DB private endpoints are deployed into client VNets, and a private endpoint for a multi-region account can have private IP mappings for the account's regions. I changed the section to say to create private endpoints per VNet where local private access is needed, or use private routing such as VNet peering, and clarified that DNS zone groups keep records updated when account regions change.

## Review Notes
- Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI references rather than local `az --help` output.
- The `az network private-endpoint create`, `az network private-endpoint dns-zone-group create`, `az cosmosdb update --public-network-access`, and `az cosmosdb update --ip-range-filter` patterns match current Azure CLI documentation.
- The C# snippet uses the current Azure Cosmos DB .NET SDK v3 `CosmosClientOptions.ConnectionMode` API, and Microsoft documentation confirms Direct mode is the default for .NET SDK v3.
