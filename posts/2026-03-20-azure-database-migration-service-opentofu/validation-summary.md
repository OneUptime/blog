# Validation Summary: How to Set Up Azure Database Migration Service with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- Azure Database Migration Service (classic)
- Azure Resource Manager (`azurerm`) provider
- Azure Virtual Network
- Azure Database for PostgreSQL Flexible Server

## Sources Consulted
- AzureRM provider docs for `azurerm_database_migration_service`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/database_migration_service.html.markdown
- AzureRM provider docs for `azurerm_database_migration_project`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/database_migration_project.html.markdown
- AzureRM provider docs for `azurerm_postgresql_flexible_server`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/postgresql_flexible_server.html.markdown
- AzureRM provider docs for `azurerm_postgresql_flexible_server_firewall_rule`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/postgresql_flexible_server_firewall_rule.html.markdown
- AzureRM provider docs for `azurerm_postgresql_flexible_server_database`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/postgresql_flexible_server_database.html.markdown
- AzureRM provider docs for `azurerm_resource_provider_registration`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/resource_provider_registration.html.markdown
- Microsoft Learn: Migrate PostgreSQL to Azure Database for PostgreSQL online using DMS (classic) via the Azure portal: https://learn.microsoft.com/en-us/azure/dms/tutorial-postgresql-azure-postgresql-online-portal
- Microsoft Learn: Microsoft.DataMigration/services ARM/Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.datamigration/services
- Microsoft Learn: Add firewall rules for Azure Database for PostgreSQL flexible server: https://learn.microsoft.com/en-us/azure/postgresql/network/how-to-networking-servers-deployed-public-access-add-firewall-rules
- Microsoft Learn: `az postgres flexible-server firewall-rule`: https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server/firewall-rule?view=azure-cli-latest
- OpenTofu docs for `init`: https://opentofu.org/docs/cli/init/
- OpenTofu docs for `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs for `apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The post used a subnet delegation block for DMS (`Microsoft.DataMigration/dataMigrationServices`). Current Azure DMS service examples and AzureRM resource docs do not require or document this delegation, so it was removed.
- The DMS instance used `Standard_1vCores` even though the post framed the setup around online PostgreSQL migrations. Microsoft’s PostgreSQL DMS classic tutorial requires the Premium tier for online migrations, so the SKU was changed to `Premium_4vCores`.
- The firewall rule assumed a single `var.dms_source_ip`. For a public Azure Database for PostgreSQL flexible server, Microsoft documents `0.0.0.0` as the Azure-internal access rule. The snippet was updated to use `0.0.0.0` for both `start_ip_address` and `end_ip_address`, with an inline note explaining that this allows Azure services such as DMS.
- The post referred to the resources generically as Azure Database Migration Service. The AzureRM resources used here map to Azure Database Migration Service (classic), so the description, introduction, and summary were clarified to prevent confusion with the newer migration service in Azure Database for PostgreSQL.

## Review Notes
- Microsoft currently recommends the newer migration service in Azure Database for PostgreSQL for PostgreSQL migrations, but the post is now technically accurate for the Azure Database Migration Service (classic) resources it demonstrates.
- `tofu` was not installed in the local environment, so the command syntax in the Deploying section was verified against the official OpenTofu documentation rather than local CLI help output.
