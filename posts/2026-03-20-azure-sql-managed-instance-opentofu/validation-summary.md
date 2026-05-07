# Validation Summary: How to Create Azure SQL Managed Instance with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SQL Managed Instance
- Azure Virtual Network, subnet delegation, Network Security Groups, and route tables
- OpenTofu / Terraform HCL
- AzureRM provider resources `azurerm_mssql_managed_instance`, `azurerm_mssql_managed_database`, and `azurerm_route_table`

## Sources Consulted
- Microsoft Learn: Connectivity architecture for Azure SQL Managed Instance https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/connectivity-architecture-overview?view=azuresql-mi
- Microsoft Learn: Determine required subnet size and range for Azure SQL Managed Instance https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/vnet-subnet-determine-size?view=azuresql
- Microsoft Learn: Service-aided subnet configuration for Azure SQL Managed Instance https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/subnet-service-aided-configuration-enable?view=azuresql
- Microsoft Learn: Automated backups for Azure SQL Managed Instance https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/automated-backups-overview?view=azuresql
- HashiCorp AzureRM provider docs: `azurerm_mssql_managed_instance` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/mssql_managed_instance.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_mssql_managed_database` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/mssql_managed_database.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_route_table` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/route_table.html.markdown

## Issues Found
- The route table example used `disable_bgp_route_propagation`, which is not the current AzureRM argument name. I updated it to `bgp_route_propagation_enabled = true` to match the current provider schema.
- The post implied that readers must define specific NSG rules and route entries themselves, but current Azure SQL Managed Instance documentation states that the subnet must have an associated NSG and route table and that Azure manages the required service rules and routes through service-aided subnet configuration. I corrected the step text, inline comments, and summary to reflect that behavior.
- The description said the post covered high availability configuration, but the tutorial does not configure zone redundancy or another HA-specific option. I updated the description to describe managed database configuration instead.

## Review Notes
- The `/27` subnet in the example is the documented minimum size. For multiple instances or future scaling operations, Microsoft recommends sizing the subnet larger than the minimum.
- The database example is valid, and `short_term_retention_days = 7` matches the documented default short-term backup retention window for Azure SQL Managed Instance databases.
