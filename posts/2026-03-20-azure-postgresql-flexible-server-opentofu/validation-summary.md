# Validation Summary: How to Set Up Azure Database for PostgreSQL Flexible Server with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Database for PostgreSQL Flexible Server
- OpenTofu / Terraform-style HCL
- Azure Virtual Network and delegated subnets
- Azure Private DNS
- AzureRM provider

## Sources Consulted
- AzureRM provider docs for `azurerm_postgresql_flexible_server`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/postgresql_flexible_server.html.markdown
- AzureRM provider docs for `azurerm_postgresql_flexible_server_configuration`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/postgresql_flexible_server_configuration.html.markdown
- AzureRM provider docs for `azurerm_postgresql_flexible_server_database`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/postgresql_flexible_server_database.html.markdown
- Azure Database for PostgreSQL private networking docs: https://learn.microsoft.com/en-us/azure/postgresql/network/concepts-networking-private
- Azure Database for PostgreSQL backup and restore docs: https://learn.microsoft.com/en-us/azure/postgresql/backup-restore/concepts-backup-restore
- Azure Database for PostgreSQL high availability docs: https://learn.microsoft.com/en-us/azure/reliability/reliability-azure-database-postgresql
- Azure Database for PostgreSQL server parameters overview: https://learn.microsoft.com/en-us/azure/postgresql/server-parameters/concepts-server-parameters
- Azure Database for PostgreSQL `shared_buffers` parameter reference: https://learn.microsoft.com/en-us/azure/postgresql/server-parameters/param-resource-usage-memory
- Microsoft Learn Terraform example for PostgreSQL Flexible Server: https://learn.microsoft.com/en-us/azure/developer/terraform/azurerm/deploy-postgresql-flexible-server-database

## Issues Found
- The private-access server example omitted `public_network_access_enabled = false`, which the current AzureRM provider documentation requires when `delegated_subnet_id` and `private_dns_zone_id` are set. I added it so the resource definition matches the current provider contract.
- The delegated subnet example omitted `service_endpoints = ["Microsoft.Storage"]`. Microsoft’s Terraform example includes it, and Azure’s private-networking docs note that the service depends on the Storage service endpoint on the delegated subnet. I added it so the subnet definition matches expected service behavior and avoids later drift.
- The `shared_buffers` example used `1024MB`, but Azure Flexible Server documents `shared_buffers` as an integer parameter with values expressed in PostgreSQL buffer units. I converted the example to `131072`, which is the 1 GiB equivalent in 8 KB pages.
- The overview and summary implied zone-redundant HA and geo-redundant backup were universally available. I narrowed the wording to reflect the documented regional constraints.

## Review Notes
- `max_connections` and `shared_buffers` are static server parameters in Azure Database for PostgreSQL Flexible Server, so changing them can trigger a restart.
- Zone-redundant HA requires a region with availability zone support and isn’t supported on the Burstable tier.
- Geo-redundant backup must be chosen at server creation time and is region-dependent.
