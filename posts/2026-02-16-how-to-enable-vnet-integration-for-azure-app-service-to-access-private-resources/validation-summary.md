# Validation Summary: How to Enable VNet Integration for Azure App Service to Access Private Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure App Service
- Azure Virtual Network Integration
- Azure Private Link and private endpoints
- Azure Private DNS
- Azure Database for PostgreSQL Flexible Server
- Azure Storage
- Azure service endpoints
- Azure Network Security Groups
- Azure NAT Gateway
- Azure CLI

## Sources Consulted
- Azure App Service VNet Integration overview: https://learn.microsoft.com/en-ca/azure/app-service/overview-vnet-integration
- Azure App Service VNet Integration routing: https://learn.microsoft.com/azure/app-service/configure-vnet-integration-routing
- Azure App Service NAT Gateway integration: https://learn.microsoft.com/azure/app-service/overview-nat-gateway-integration
- Azure App Service name resolution: https://learn.microsoft.com/azure/app-service/overview-name-resolution
- Azure App Service VNet Integration troubleshooting: https://learn.microsoft.com/troubleshoot/azure/app-service/troubleshoot-vnet-integration-apps
- Azure CLI `az webapp vnet-integration`: https://learn.microsoft.com/cli/azure/webapp/vnet-integration
- Azure CLI `az webapp config set`: https://learn.microsoft.com/cli/azure/webapp/config
- Azure CLI `az network private-endpoint`: https://learn.microsoft.com/cli/azure/network/private-endpoint
- Azure CLI `az network private-endpoint dns-zone-group`: https://learn.microsoft.com/cli/azure/network/private-endpoint/dns-zone-group
- Azure Database for PostgreSQL private endpoint documentation: https://learn.microsoft.com/azure/postgresql/network/how-to-networking-servers-deployed-public-access-add-private-endpoint

## Issues Found
- The post stated that the App Service plan must be Standard (S1) or higher. Azure documentation says VNet Integration is supported on dedicated compute tiers including Basic, Standard, Premium, Premium v2/v3/v4, and Elastic Premium, so the prerequisite was corrected.
- The post described Azure as creating a customer-visible network interface for App Service VNet Integration. Azure documentation describes mounted virtual interfaces on workers, so the wording was corrected.
- The Regional VNet Integration description overclaimed support for "all VNet features." It was changed to the documented access patterns: VNet resources, peered VNets, service endpoint-secured services, and private endpoint-enabled services.
- The Route All section omitted service endpoint traffic from the default routing behavior and used the legacy app setting command. It was updated to mention service endpoint routing and to use `az webapp config set --vnet-route-all-enabled true`.
- The PostgreSQL private endpoint DNS zone group used `--zone-name postgresqlServer`, which is the target subresource name, not the recommended DNS zone configuration name. It was changed to `privatelink-postgres-database-azure-com`.
- The DNS section incorrectly tied private DNS resolution to `WEBSITE_VNET_ROUTE_ALL=1`. App Service uses the VNet DNS configuration when integrated with a VNet, so the conditions and optional DNS override command were corrected.
- The NAT Gateway section implied attaching a NAT Gateway alone controls public outbound IP. Azure App Service requires all internet-bound traffic to be routed through the VNet for NAT Gateway to provide the static outbound IP, so that requirement was added.
- The Kudu troubleshooting commands used non-Windows executable names and `host:port` syntax for `tcpping`. They were corrected to `nameresolver.exe hostname` and `tcpping.exe hostname port`.
- The common DNS troubleshooting note incorrectly required `WEBSITE_VNET_ROUTE_ALL=1`; it now points to private DNS zone links and DNS server resolution.

## Review Notes
- Azure still supports legacy app settings such as `WEBSITE_VNET_ROUTE_ALL` and `WEBSITE_DNS_SERVER`, but current documentation recommends site properties where available because they are validated and easier to audit with Azure Policy.
- The storage private endpoint example creates the endpoint but does not show creating or linking the storage private DNS zone. That is not technically wrong for the narrow example, but a future expansion could include the `privatelink.blob.core.windows.net` DNS zone group for a more complete walkthrough.
