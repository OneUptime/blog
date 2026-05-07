# Validation Summary: How to Set Up Azure SQL Failover Groups with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure SQL Database
- Azure SQL Failover Groups
- OpenTofu / HCL
- AzureRM provider
- Microsoft Entra administrator configuration for Azure SQL logical servers

## Sources Consulted
- Azure SQL failover groups overview and best practices: https://learn.microsoft.com/en-us/azure/azure-sql/database/failover-group-sql-db?view=azuresql-db
- Configure a failover group for Azure SQL Database: https://learn.microsoft.com/en-us/azure/azure-sql/database/failover-group-configure-sql-db?view=azuresql-db
- Configure and manage Azure SQL Database security for geo-restore or failover: https://learn.microsoft.com/en-us/azure/azure-sql/database/active-geo-replication-security-configure?view=azuresql
- AzureRM `azurerm_mssql_server` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server
- AzureRM `azurerm_mssql_database` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database
- AzureRM `azurerm_mssql_failover_group` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_failover_group
- AzureRM `azurerm_mssql_firewall_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_firewall_rule

## Issues Found
- The original description, overview, and summary overstated failover behavior as generally automatic and seamless. I updated the wording to reflect Azure SQL's stable listener endpoints and the DNS-based redirection behavior documented for failover groups.
- The original `grace_minutes` comment said failover occurs after 60 minutes of primary unavailability. I corrected this to reflect that `mode = "Automatic"` is Microsoft-managed failover after the configured grace period during a qualifying outage.
- The original `readonly_endpoint_failover_policy_enabled` comment implied that setting enables normal routing of read traffic to the secondary. I corrected the comment to match Azure's documented behavior for read-only listener failover during Microsoft-managed failover scenarios.
- The original secondary server configuration omitted the `azuread_administrator` block even though the primary server defined one. I added the same server-level administrator configuration to the secondary so authentication settings are aligned for failover.

## Review Notes
- Azure recommends paired regions for failover groups when possible for better performance. The sample uses two different regions, which is valid, but production designs should prefer paired regions when feasible.
- Azure SQL logical server names and failover group names must be globally unique. The sample names should be treated as placeholders.
