# Validation Summary: How to Deploy Azure SQL Managed Instance with Failover Groups in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure SQL Managed Instance
- Azure SQL Managed Instance failover groups
- Azure Virtual Network, subnet delegation, NSGs, route tables, and VNet peering

## Sources Consulted
- Microsoft Learn: Azure SQL Managed Instance connectivity architecture and network requirements: https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/connectivity-architecture-overview?view=azuresql-mi
- Microsoft Learn: Failover groups overview and best practices for Azure SQL Managed Instance: https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/failover-group-sql-mi?view=azuresql-mi
- Microsoft Learn: Configure a failover group for Azure SQL Managed Instance: https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/failover-group-configure-sql-mi?view=azuresql-mi
- Terraform Registry: azurerm_mssql_managed_instance resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_managed_instance
- Terraform Registry: azurerm_mssql_managed_instance_failover_group resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_managed_instance_failover_group
- Microsoft Azure pricing page and Azure Retail Prices API for SQL Managed Instance pricing behavior: https://azure.microsoft.com/en-us/pricing/details/azure-sql-managed-instance/single/ and https://prices.azure.com/api/retail/prices

## Issues Found
- The secondary SQL Managed Instance did not set `dns_zone_partner_id`. Microsoft documentation says the two managed instances in a SQL Managed Instance failover group must share the same DNS zone, and Terraform exposes this through `dns_zone_partner_id`. I added `dns_zone_partner_id = azurerm_mssql_managed_instance.primary.id` to the secondary instance.
- The listener endpoint outputs omitted the SQL Managed Instance DNS zone ID. Microsoft documents SQL MI failover group listeners as `fog-name.<zone_id>.database.windows.net` and `fog-name.secondary.<zone_id>.database.windows.net`, not plain `fog-name.database.windows.net`. I updated the outputs to interpolate `azurerm_mssql_managed_instance.primary.dns_zone`.
- The read-only endpoint wording said it always points to "secondary." I changed this to "current secondary" to match failover group behavior after role changes.
- The cost estimate was too specific and likely to become inaccurate because pricing varies by region, service tier, vCores, storage, backup storage, and license model. I replaced it with a technically accurate pricing note and mentioned the license-free standby replica option for DR-only secondaries.

## Review Notes
- The Terraform resource names and key arguments used in the examples are current for the AzureRM provider documentation reviewed on 2026-06-01.
- The networking guidance is directionally correct: SQL Managed Instance requires a dedicated delegated subnet with an associated NSG and route table, and Azure manages required network intent policy entries through service-aided subnet configuration.
- Terraform's documented default create/update/delete timeout for `azurerm_mssql_managed_instance` is currently 24 hours, so the explicit 8-hour timeout example is optional rather than required.
