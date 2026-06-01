# Validation Summary: How to Scale Azure Functions on Premium Plan with VNET Integration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Functions
- Azure Functions Premium plan
- Azure App Service VNET integration
- Azure Virtual Network subnets and subnet delegation
- Azure CLI
- Azure SQL Database private endpoints
- Azure Private DNS
- Azure Functions host.json configuration
- Application Insights scale controller logging

## Sources Consulted
- Azure Functions Premium plan: https://learn.microsoft.com/en-ca/azure/azure-functions/functions-premium-plan
- Azure Functions scale and hosting options: https://learn.microsoft.com/en-gb/azure/azure-functions/functions-scale
- Azure Functions Flex Consumption plan: https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-plan
- Azure Functions networking options: https://learn.microsoft.com/en-au/azure/azure-functions/functions-networking-options
- App Service virtual network integration overview: https://learn.microsoft.com/en-us/azure/app-service/overview-vnet-integration
- App Service VNET integration routing: https://learn.microsoft.com/en-us/azure/app-service/configure-vnet-integration-routing
- Azure CLI az functionapp create: https://learn.microsoft.com/en-us/cli/azure/functionapp
- Azure CLI az functionapp plan create/update: https://learn.microsoft.com/en-us/cli/azure/functionapp/plan
- Azure CLI az network private-endpoint create: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Azure CLI private endpoint DNS zone group: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Azure SQL Database Private Link: https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview
- Azure Private Endpoint DNS zone values: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Azure Functions monitoring and scale controller logging: https://learn.microsoft.com/en-ie/azure/azure-functions/configure-monitoring
- Azure Queue storage trigger host.json settings: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue

## Issues Found
- The post treated the Consumption plan as though all Consumption-style hosting lacks VNET integration. Updated wording to "classic Consumption plan" because Flex Consumption now supports VNET integration.
- The post described Premium VNET integration as injecting the function into a subnet. Updated this to describe outbound VNET integration, because App Service VNET integration provides outbound access and does not provide inbound private access.
- The Linux function app example created a Premium plan without specifying Linux workers. Added `--is-linux true` to the `az functionapp plan create` command so the Linux function app can be created on a compatible plan.
- The route-all configuration used the legacy `WEBSITE_VNET_ROUTE_ALL` app setting. Replaced it with the current `properties.outboundVnetRouting.allTraffic=true` site property using `az resource update`.
- The DNS comments implied that `168.63.129.16` is always the VNET DNS server. Clarified that this is Azure DNS for Azure Private DNS zones and that custom DNS environments should use their custom DNS server IP.
- The post called the host.json sample "per-function scaling limits." Updated this to "trigger concurrency settings" because these host.json settings affect trigger concurrency and host behavior, not a per-function max instance count.
- The subnet sizing section counted only steady-state available IPs and did not account for Azure-reserved addresses, App Service plan instance IP usage, or temporary doubled IP usage during scale operations. Updated the explanation and table to include scale-operation headroom.
- The post stated that every function app in the same VNET needs a dedicated subnet. Updated this to reflect that apps in the same App Service plan can share a VNET integration subnet, and that multi-plan subnet join can allow multiple plans to share a /26 or larger subnet.

## Review Notes
- The Azure CLI was not installed in the local workspace, so CLI validation was performed against Microsoft Learn CLI reference pages.
- The example storage account and function app names must still be globally unique in a real Azure subscription.
