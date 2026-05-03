# Validation Summary: How to Deploy Azure SQL Database with OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- Terraform AzureRM provider (`hashicorp/azurerm`)
- Azure SQL Database (logical server, single database, Elastic Pool)
- Azure Private Endpoint / Private Link
- Azure Private DNS Zones
- Azure SQL firewall rules
- Azure AD authentication for SQL

## Sources Consulted
- AzureRM `azurerm_mssql_server`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server
- AzureRM `azurerm_mssql_database`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database
- AzureRM `azurerm_mssql_elasticpool`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_elasticpool
- AzureRM `azurerm_mssql_firewall_rule`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_firewall_rule
- AzureRM `azurerm_private_endpoint`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint
- AzureRM `azurerm_private_dns_zone` and `azurerm_private_dns_zone_virtual_network_link` docs
- Azure Private Link resource group IDs reference (Microsoft Learn): `sqlServer` is the correct subresource for `Microsoft.Sql/servers`

## Issues Found
- **`backup_retention_period_in_days` on `azurerm_mssql_database`**: This is not a valid top-level argument on the resource. Backup retention for point-in-time restore is configured via the `short_term_retention_policy` block with `retention_days` (1–35). Replaced the line with the proper nested block:
  ```hcl
  short_term_retention_policy {
    retention_days = 7
  }
  ```

All other resources, arguments, blocks, and values were verified against the AzureRM provider docs and confirmed correct, including:
- `azurerm_mssql_server` arguments (`version = "12.0"`, `minimum_tls_version`, `public_network_access_enabled`, `outbound_network_restriction_enabled`, `azuread_administrator` block fields).
- Private endpoint `subresource_names = ["sqlServer"]` (the documented Private Link group ID for Azure SQL Server).
- Private DNS zone name `privatelink.database.windows.net` (the documented Microsoft-recommended zone).
- The `AllowAzureServices` firewall rule using `0.0.0.0`–`0.0.0.0` (the special Azure-services rule).
- `azurerm_mssql_elasticpool` `sku` block (`name`, `tier`, `family`, `capacity`) and `per_database_settings` (`min_capacity`, `max_capacity`).
- `azurerm_mssql_database` with `sku_name = "ElasticPool"` for pool membership.

## Review Notes
- The post depends on resources it does not define in-snippet (`azurerm_resource_group.main`, `azurerm_virtual_network.main`, and several variables). This is reasonable for a focused, single-topic guide, but readers will need to bring their own networking/RG scaffolding.
- The example sets `public_network_access_enabled = false` and configures a private endpoint, which is the recommended production posture. Combined with `outbound_network_restriction_enabled = true`, users will need outbound rules / a VNet rule allow-list to talk out — worth keeping in mind for downstream tutorials.
- `maintenance_configuration_name = "SQL_Default"` is valid; users wanting custom maintenance windows would switch to `SQL_<Region>_DB_<N>` values.
- The connection string output uses `Authentication=Active Directory Default;` which assumes the application is using a recent Microsoft.Data.SqlClient and supports the AAD Default flow — fine for modern apps.
