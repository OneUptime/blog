# Validation Summary: How to Configure Private Endpoints for Azure App Service

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure App Service
- Azure Private Endpoint / Azure Private Link
- Azure Private DNS
- Azure Virtual Network and VNet peering
- Azure App Service access restrictions
- Azure App Service VNet Integration
- Azure CLI

## Sources Consulted
- Microsoft Learn: Use private endpoints for Azure App Service apps: https://learn.microsoft.com/en-us/azure/app-service/overview-private-endpoint
- Microsoft Learn: Azure App Service access restrictions: https://learn.microsoft.com/en-us/azure/app-service/overview-access-restrictions
- Microsoft Learn: Enable virtual network integration in Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/configure-vnet-integration-enable
- Microsoft Learn: Azure CLI `az network private-endpoint`: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Microsoft Learn: Azure CLI `az network private-endpoint dns-zone-group`: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Microsoft Learn: Azure CLI `az network private-dns link vnet`: https://learn.microsoft.com/en-us/cli/azure/network/private-dns/link/vnet
- Microsoft Learn: Azure CLI `az network vnet subnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Microsoft Learn: Azure CLI `az webapp config access-restriction`: https://learn.microsoft.com/en-us/cli/azure/webapp/config/access-restriction
- Microsoft Learn: Azure CLI `az webapp vnet-integration`: https://learn.microsoft.com/en-us/cli/azure/webapp/vnet-integration

## Issues Found
- Clarified that the private endpoint, not the App Service resource itself, receives the private IP address from the VNet subnet.
- Clarified that private endpoints remove public internet exposure only when public network access is disabled.
- Replaced the older subnet policy CLI flag `--disable-private-endpoint-network-policies true` with the current `--private-endpoint-network-policies Disabled` form from the Azure CLI reference.
- Replaced `az network private-dns zone virtual-network-link create` with the current documented command, `az network private-dns link vnet create`.
- Removed the example that used a VNet subnet access restriction alongside a private endpoint. Microsoft documentation states that access restrictions are not evaluated for private endpoint traffic, and service endpoint-based access restriction rules are not supported on apps with private endpoints configured.
- Corrected SCM guidance. The SCM hostname can resolve through the same private endpoint IP when Azure Private DNS zone groups are used; keeping SCM public requires public network access to remain enabled and SCM restrictions to be configured separately.
- Updated the outbound route-all example from the older `WEBSITE_VNET_ROUTE_ALL` app setting to the currently documented `properties.outboundVnetRouting.allTraffic=true` resource property.
- Corrected troubleshooting guidance so IP access restrictions are not presented as a way to bypass `publicNetworkAccess=Disabled`.

## Review Notes
The remaining examples are illustrative and use placeholder resource names, IP ranges, and subnet names. The post does not mention Azure App Service Environment v3's separate requirement to enable private endpoint support at the ASE level; that is a valid future caveat but not required for the general App Service scenario covered here.
