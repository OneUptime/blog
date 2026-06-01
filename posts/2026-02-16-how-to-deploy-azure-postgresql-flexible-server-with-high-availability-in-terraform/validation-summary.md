# Validation Summary: How to Deploy Azure PostgreSQL Flexible Server

## Status
validated

## Post Type
Tutorial / Infrastructure-as-code guide

## Technologies Covered
- Azure Database for PostgreSQL Flexible Server
- Azure availability zones and high availability
- Terraform
- HashiCorp AzureRM provider
- HashiCorp Random provider
- Azure Virtual Network delegated subnets
- Azure Private DNS
- Azure Monitor diagnostic settings
- PostgreSQL server parameters and extensions

## Sources Consulted
- Azure Database for PostgreSQL reliability and high availability: https://learn.microsoft.com/en-us/azure/reliability/reliability-database-postgresql
- Azure Database for PostgreSQL private networking: https://learn.microsoft.com/en-us/azure/postgresql/network/concepts-networking-private
- Azure Database for PostgreSQL monitoring and resource log categories: https://learn.microsoft.com/en-us/azure/postgresql/monitor/concepts-monitoring
- Azure Database for PostgreSQL compute options: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-compute
- Azure Database for PostgreSQL memory server parameters: https://learn.microsoft.com/en-us/azure/postgresql/server-parameters/param-resource-usage-memory
- Azure Database for PostgreSQL connection settings server parameters: https://learn.microsoft.com/en-us/azure/postgresql/server-parameters/param-connections-authentication-connection-settings
- Azure Database for PostgreSQL extensions and modules: https://learn.microsoft.com/en-us/azure/postgresql/extensions/concepts-extensions
- Terraform AzureRM `azurerm_postgresql_flexible_server` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server
- Terraform AzureRM `azurerm_monitor_diagnostic_setting` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting
- Terraform AzureRM 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- Terraform Random `random_password` documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password

## Issues Found
- The post pinned AzureRM to `~> 3.80` while using PostgreSQL 16 and `storage_tier`, which are not supported by that old provider version. Updated the provider constraint to current AzureRM 4.x and added the required `subscription_id` provider configuration.
- The PostgreSQL version variable described only versions 13-16. Updated it to include currently documented provider support through PostgreSQL 18.
- The server name used `random_password.pg_admin.id`, but the Random provider documents that `id` is an internal static value and should not be referenced. Added a `random_string` suffix resource and used it in the server name.
- The private networking example omitted `public_network_access_enabled = false`, which AzureRM requires when using delegated subnet and private DNS configuration in current provider versions. Added it to the server resource.
- The `max_connections` comment said the default is typically around 100. Azure Flexible Server defaults depend on the selected SKU and are much higher for `GP_Standard_D4ds_v5`, so the comment was corrected.
- The `shared_buffers` and `effective_cache_size` values and comments were inconsistent with Azure's documented 8 KB-unit formulas for a 16 GiB `D4ds_v5` server. Updated the values and comments to match that SKU.
- The `pg_stat_statements` example set only `shared_preload_libraries`, but Azure documents that `pg_stat_statements` is preloaded and still must be allow-listed and created in each database. Replaced the example with `azure.extensions = PG_STAT_STATEMENTS` and clarified the `CREATE EXTENSION` step.
- The analytics database comment said it used a different collation while the code used the same collation. Corrected the comment.
- The firewall-rule section could be misapplied to the private-access server shown earlier. Added a sentence clarifying that firewall rules apply only to a public-access server configuration.
- The diagnostic setting used the AzureRM 3.x `metric` block. Current AzureRM uses `enabled_metric`, so the block was updated.

## Review Notes
Terraform is not installed in this environment, so I could not run `terraform validate`. The review was performed against current official Azure and HashiCorp documentation.
