# Validation Summary: How to Configure Azure Private Link IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Private Link
- Azure Private Endpoint
- Azure Virtual Network
- IPv6
- Azure Private DNS
- Azure CLI
- Bicep

## Sources Consulted
- Microsoft Learn: What is a private endpoint? https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview
- Microsoft Learn: What is Azure Private Link? https://learn.microsoft.com/en-us/azure/private-link/private-link-overview
- Microsoft Learn: Manage Azure private endpoints https://learn.microsoft.com/en-us/azure/private-link/manage-private-endpoint
- Microsoft Learn: Azure Private Endpoint private DNS zone values https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Overview of IPv6 for Azure Virtual Network https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Microsoft Learn: Microsoft.Network/privateEndpoints template reference https://learn.microsoft.com/en-us/azure/templates/microsoft.network/privateendpoints
- Microsoft Learn: Private Endpoints - Create Or Update REST API https://learn.microsoft.com/en-us/rest/api/virtualnetwork/private-endpoints/create-or-update?view=rest-virtualnetwork-2025-05-01&viewFallbackFrom=rest-virtualnetwork-2025-01-01
- Microsoft Learn: az network private-endpoint https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint?view=azure-cli-lts
- Microsoft Learn: az network private-endpoint ip-config https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/ip-config?view=azure-cli-lts
- Microsoft Learn: az network private-endpoint dns-zone-group https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group?view=azure-cli-latest
- Microsoft Learn: az network private-link-resource https://learn.microsoft.com/en-us/cli/azure/network/private-link-resource?view=azure-cli-latest
- Microsoft Learn: az network vnet https://learn.microsoft.com/en-us/cli/azure/network/vnet?view=azure-cli-latest
- Microsoft Learn: az network vnet subnet https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet?view=azure-cli-latest
- Microsoft Learn: az network private-dns link vnet https://learn.microsoft.com/en-us/cli/azure/network/private-dns/link/vnet?view=azure-cli-lts
- Microsoft Learn: Deploy templates with Azure CLI https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-cli
- Microsoft Learn: What is Azure Private Link service? https://learn.microsoft.com/en-us/azure/private-link/private-link-service-overview

## Issues Found
- The original post conflated Azure Private Link with Azure ExpressRoute IPv6 private peering. I replaced the introduction, prerequisites, steps, and conclusion so the article now describes private endpoint IPv6 configuration instead of BGP and route advertisement.
- The original terminology used `VPC` and `inter-VPC`, which is not Azure terminology. I corrected those references to `VNet` and Azure-specific networking concepts.
- The original ExpressRoute peering examples were not relevant to configuring a private endpoint, and the sample IPv6 prefixes such as `2001:db8:primary::/126` were invalid. I removed those commands and replaced them with documented VNet, subnet, Private Link resource discovery, DNS, and deployment examples.
- The original route-table step implied IPv6 UDRs were required for Private Link. I replaced it with the actual private endpoint workflow, where DNS configuration is the required follow-up step for name resolution.
- The original Terraform example configured `azurerm_express_route_circuit_peering`, which is not a Private Link resource. I replaced it with an official Bicep example for `Microsoft.Network/privateEndpoints` using `ipVersionType: 'DualStack'`.
- I added DNS configuration steps using the recommended private DNS zone workflow and validation commands that align with current Azure documentation.

## Review Notes
- Azure CLI documentation currently exposes private endpoint static IP configuration and DNS zone group commands, but the explicit `ipVersionType` setting is documented through ARM/Bicep and REST. The post therefore uses Bicep for the endpoint deployment step.
- The example uses Azure Storage blob as the target service. For other services, readers must substitute the correct private DNS zone name, `groupId`, and `memberName` returned by `az network private-link-resource list`.
- ExpressRoute private peering or VPN can still be relevant for on-premises access to a private endpoint, but they are not required to create or configure the private endpoint itself.
