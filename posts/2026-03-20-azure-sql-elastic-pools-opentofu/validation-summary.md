# Validation Summary: How to Configure Azure SQL Elastic Pools with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SQL Database
- Azure SQL Elastic Pools
- OpenTofu
- HCL
- AzureRM provider

## Sources Consulted
- AzureRM provider docs for `azurerm_mssql_server`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server
- AzureRM provider docs for `azurerm_mssql_elasticpool`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_elasticpool
- AzureRM provider docs for `azurerm_mssql_database`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database
- Microsoft Learn, "Resource limits for elastic pools using the vCore purchasing model": https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-vcore-elastic-pools?view=azuresql
- Microsoft Learn, "Resource limits for elastic pools using the DTU purchasing model": https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-dtu-elastic-pools?view=azuresql
- Microsoft Learn, "Manage elastic pools in Azure SQL Database": https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-pool-manage?view=azuresql

## Issues Found
- The original comments for `per_database_settings.min_capacity` and `per_database_settings.max_capacity` were slightly inaccurate. A non-zero `min_capacity` is a guaranteed reserved minimum per database, not a "near-zero" idle state, and `max_capacity` is an upper limit a database can use only when pool capacity is available. I updated those comments to match Microsoft Learn and AzureRM provider behavior.

## Review Notes
- The HCL snippets are otherwise consistent with the current AzureRM provider documentation.
- `GP_Gen5` remains the correct AzureRM SKU name even though Microsoft Learn now refers to the underlying hardware as standard-series (Gen5).
- `administrator_login_password` is still valid, but AzureRM documents that this value is stored in Terraform/OpenTofu state as plaintext unless a write-only pattern is used.
