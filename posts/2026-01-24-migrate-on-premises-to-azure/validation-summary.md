# Validation Summary: How to Migrate from On-Premises to Azure

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microsoft Azure
- Azure Migrate
- Azure PowerShell Az.Migrate module
- Azure CLI
- Azure Database Migration Service
- Azure Monitor
- Azure Backup
- Azure Networking
- AzCopy
- SQL Server CDC

## Sources Consulted
- Microsoft Learn: Azure Migrate CLI reference - https://learn.microsoft.com/en-us/cli/azure/migrate?view=azure-cli-latest
- Microsoft Learn: Create an Azure Migrate project - https://learn.microsoft.com/en-us/azure/migrate/quickstart-create-project?view=migrate
- Microsoft Learn: New-AzMigrateProject - https://learn.microsoft.com/en-us/powershell/module/az.migrate/new-azmigrateproject?view=azps-16.0.0
- Microsoft Learn: Discover VMware servers with Azure Migrate - https://learn.microsoft.com/en-us/azure/migrate/tutorial-discover-vmware?view=migrate
- Microsoft Learn: Create an Azure VM assessment - https://learn.microsoft.com/en-us/azure/migrate/how-to-create-assessment?view=migrate
- Microsoft Learn: Migrate VMware VMs to Azure with PowerShell - https://learn.microsoft.com/en-us/azure/migrate/tutorial-migrate-vmware-powershell?view=migrate
- Microsoft Learn: New-AzMigrateServerReplication - https://learn.microsoft.com/en-us/powershell/module/az.migrate/new-azmigrateserverreplication?view=azps-16.0.0
- Microsoft Learn: Start-AzMigrateTestMigration - https://learn.microsoft.com/en-us/powershell/module/az.migrate/start-azmigratetestmigration
- Microsoft Learn: Azure Migrate dependency analysis FAQ - https://learn.microsoft.com/en-us/azure/migrate/common-questions-discovery-dependency-analysis?view=migrate
- Microsoft Learn: VM Insights Map and Dependency Agent retirement guidance - https://learn.microsoft.com/en-us/azure/azure-monitor/vm/vminsights-maps-retirement
- Microsoft Learn: Azure Database Migration Service CLI - https://learn.microsoft.com/en-us/cli/azure/dms?view=azure-cli-latest
- Microsoft Learn: Azure Database Migration Service automation - https://learn.microsoft.com/en-us/azure/dms/migration-dms-powershell-cli
- Microsoft Learn: Virtual network gateway CLI - https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway?view=azure-cli-latest
- Microsoft Learn: ExpressRoute CLI - https://learn.microsoft.com/en-us/cli/azure/network/express-route?view=azure-cli-latest
- Microsoft Learn: Azure Monitor Agent management - https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-manage
- Microsoft Learn: Metric alert CLI - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert?view=azure-cli-latest
- Microsoft Learn: Azure Backup protection CLI - https://learn.microsoft.com/en-us/cli/azure/backup/protection?view=azure-cli-latest

## Issues Found
- Replaced non-existent Azure CLI examples for `az migrate project create`, `az migrate assessment create`, and `az migrate assessment show` with supported Azure PowerShell and Azure portal guidance.
- Removed the non-existent `Start-AzMigrateDiscovery` cmdlet and replaced it with `Get-AzMigrateDiscoveredServer` for verifying appliance discovery results.
- Updated dependency visualization guidance to prefer Azure Migrate agentless dependency analysis where supported and to mention the Dependency Agent retirement guidance for agent-based scenarios.
- Added a required `GatewaySubnet` to the target VNet before the VPN gateway example.
- Replaced invalid `az migrate replication-policy` and `az migrate replicated-item` examples with current `Az.Migrate` PowerShell cmdlets for initializing infrastructure, starting replication, monitoring replication, test migration, and cleanup.
- Clarified that the `az dms` examples use Azure Database Migration Service classic CLI commands.
- Updated the Azure Monitor Agent installation command to use `--enable-auto-upgrade true` instead of pinning `--version 1.0`.

## Review Notes
- The Azure CLI was not installed in the local environment, so CLI command validation was performed against Microsoft Learn CLI references rather than local `az --help` output.
- Azure Database Migration Service has both classic `az dms` commands and newer `az datamigration` automation paths. The existing example is valid for the classic command group, but future revisions could modernize this section for a specific SQL migration target.
