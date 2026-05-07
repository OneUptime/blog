# Validation Summary: How to Configure Azure App Service VNet Integration with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AzureRM provider
- Azure App Service
- Azure Virtual Network
- Azure Private Endpoint
- Azure Private DNS
- Azure Database for PostgreSQL Flexible Server

## Sources Consulted
- Microsoft Learn: Integrate your app with an Azure virtual network - https://learn.microsoft.com/en-us/azure/app-service/overview-vnet-integration
- Microsoft Learn: Manage Azure App Service virtual network integration routing - https://learn.microsoft.com/en-us/azure/app-service/configure-vnet-integration-routing
- Microsoft Learn: Use private endpoints for Azure App Service apps - https://learn.microsoft.com/en-us/azure/app-service/overview-private-endpoint
- Microsoft Learn: Network with private access (virtual network integration) for Azure Database for PostgreSQL - https://learn.microsoft.com/en-us/azure/postgresql/network/concepts-networking-private
- Terraform provider docs: `azurerm_service_plan` - https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/service_plan.html.markdown
- Terraform provider docs: `azurerm_linux_web_app` - https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/linux_web_app.html.markdown
- Terraform provider docs: `azurerm_postgresql_flexible_server` - https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/postgresql_flexible_server.html.markdown
- Terraform provider docs: `azurerm_private_endpoint` - https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/private_endpoint.html.markdown

## Issues Found
- The overview implied App Service VNet Integration covered app access generally. Azure documents that VNet Integration is outbound only, so I clarified that private inbound access requires a separate private endpoint.
- The App Service plan note said Standard or Premium was required. Current Azure documentation states VNet Integration is supported on Basic and higher dedicated tiers, so I corrected the requirement text while keeping the `P1v3` example valid.
- The PostgreSQL Flexible Server example was incomplete and would not work as shown. The subnet used for `delegated_subnet_id` must be delegated to `Microsoft.DBforPostgreSQL/flexibleServers`, should include the Storage service endpoint, and the server needs a private DNS zone plus `public_network_access_enabled = false` when deployed with `delegated_subnet_id` and `private_dns_zone_id`. I added the required subnet delegation, private DNS resources, and the missing server setting.
- The original example reused a generic backend subnet for both PostgreSQL Flexible Server and the App Service private endpoint. Azure requires the PostgreSQL delegated subnet to be used only by PostgreSQL Flexible Server, and App Service private endpoints must also be on a different subnet than VNet Integration. I split the example into separate PostgreSQL and private-endpoint subnets.
- The App Service private endpoint snippet omitted the required private DNS setup. Microsoft documents that without a private DNS zone such as `privatelink.azurewebsites.net`, the default hostname resolves publicly and can return HTTP 403 instead of the private endpoint. I added the private DNS zone, VNet link, and `private_dns_zone_group`.
- The summary overstated what `vnet_route_all_enabled` guarantees. I corrected it to match Azure's routing documentation: it sends outbound traffic from the app into the integrated VNet so your routing, NSGs, and NAT configuration apply, but private network paths depend on the backend resources also being privately exposed.

## Review Notes
- Azure documents `/28` as the minimum size for an existing App Service integration subnet, but recommends planning larger ranges such as `/26` for scale headroom. The post now reflects that nuance in the subnet comment.
- The App Service example still leaves public access enabled. That is technically valid because private endpoints and public access can coexist, but if the intent is private-only inbound access, `public_network_access_enabled = false` should also be set on the web app.
