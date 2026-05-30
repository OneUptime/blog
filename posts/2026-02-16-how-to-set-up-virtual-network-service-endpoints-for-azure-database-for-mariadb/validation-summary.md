# Validation Summary: How to Set Up Virtual Network Service Endpoints for Azure Database for MariaDB

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Azure Database for MariaDB
- Azure Virtual Network service endpoints
- Azure CLI
- Azure App Service VNet Integration
- Azure Private Link
- Azure Monitor diagnostic settings

## Sources Consulted
- Microsoft Lifecycle: Azure Database for MariaDB - https://learn.microsoft.com/en-us/lifecycle/products/azure-database-for-mariadb
- Azure virtual network service endpoints - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview
- Azure CLI: az mariadb server vnet-rule - https://learn.microsoft.com/en-us/cli/azure/mariadb/server/vnet-rule
- Azure CLI: az network vnet subnet - https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Azure Resource Manager reference: Microsoft.DBforMariaDB/servers/virtualNetworkRules - https://learn.microsoft.com/en-us/azure/templates/microsoft.dbformariadb/servers/virtualnetworkrules
- Azure Private Link private endpoint overview - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview
- Azure App Service VNet Integration overview - https://learn.microsoft.com/en-us/azure/app-service/overview-vnet-integration

## Issues Found
- The post is dated February 16, 2026, but Azure Database for MariaDB retired on September 19, 2025 according to Microsoft Lifecycle. A new setup tutorial for this service is no longer actionable and should not be published as current guidance.
- The service endpoint name used throughout the post, `Microsoft.DBforMariaDB`, is incorrect for subnet service endpoints. Microsoft documentation lists Azure Database for MariaDB service endpoints under `Microsoft.Sql`; the ARM template examples for MariaDB virtual network rules also use `service: 'Microsoft.Sql'`.
- The cross-region guidance is misleading. Microsoft documents Azure SQL service endpoints as regional, and the shown `--service-endpoint-policy ""` command does not target a database region; `--service-endpoint-policy` applies service endpoint policies by name or ID.
- The Private Link comparison is inaccurate. The post says Private Link may not be available for MariaDB, but Microsoft Private Link documentation lists Azure Database for MariaDB with resource type `Microsoft.DBforMariaDB/servers` and group ID `mariadbServer`.
- The App Service section omits important current constraints: VNet Integration supports service endpoint-secured services, but the integration subnet cannot have service endpoint policies enabled, and the app and VNet must be in the same region.

## Review Notes
Because the target Azure service has already retired, these issues were not corrected in the post body. The post should be removed or replaced with migration-focused guidance for Azure Database for MySQL Flexible Server.
