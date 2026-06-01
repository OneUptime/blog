# Validation Summary: How to Design an Active-Passive Disaster Recovery Strategy

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Site Recovery
- Azure Recovery Services vaults
- Azure CLI
- Azure PowerShell / Az.RecoveryServices
- Azure Traffic Manager
- Azure Front Door
- Azure SQL Database failover groups
- Azure Cosmos DB automatic failover
- Azure Automation runbooks
- Mermaid diagrams

## Sources Consulted
- Azure CLI reference: `az backup vault create` - https://learn.microsoft.com/en-us/cli/azure/backup/vault?view=azure-cli-lts
- Azure CLI reference: `az resource create` - https://learn.microsoft.com/en-us/cli/azure/resource?view=azure-cli-latest
- Azure CLI reference: `az site-recovery` extension - https://learn.microsoft.com/en-us/cli/azure/site-recovery?view=azure-cli-latest
- Azure CLI reference: `az site-recovery protected-item create` - https://learn.microsoft.com/en-us/cli/azure/site-recovery/protected-item?view=azure-cli-latest
- Azure CLI reference: `az site-recovery policy create` - https://learn.microsoft.com/en-us/cli/azure/site-recovery/policy?view=azure-cli-latest
- Azure CLI reference: `az site-recovery recovery-plan create` - https://learn.microsoft.com/en-us/cli/azure/site-recovery/recovery-plan?view=azure-cli-latest
- Azure Site Recovery replication policy REST API - https://learn.microsoft.com/en-us/rest/api/site-recovery/replication-policies/create?view=rest-site-recovery-2025-02-01
- Azure Site Recovery test failover documentation - https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-test-failover-to-azure
- Azure PowerShell `Start-AzRecoveryServicesAsrTestFailoverJob` - https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/start-azrecoveryservicesasrtestfailoverjob
- Azure PowerShell `Set-AzRecoveryServicesAsrVaultContext` - https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/set-azrecoveryservicesasrvaultcontext
- Azure Site Recovery runbook automation documentation - https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-runbook-automation
- Azure Traffic Manager endpoint monitoring - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-monitoring
- Azure CLI reference: `az network traffic-manager` - https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager?view=azure-cli-lts
- Azure CLI reference: `az sql failover-group create` - https://learn.microsoft.com/en-us/cli/azure/sql/failover-group?view=azure-cli-lts
- Azure SQL Database failover group listener endpoint documentation - https://learn.microsoft.com/en-us/azure/azure-sql/database/auto-failover-group-configure-sql-db
- Azure CLI reference: `az cosmosdb update` and `az cosmosdb failover-priority-change` - https://learn.microsoft.com/en-us/cli/azure/cosmosdb?view=azure-cli-latest
- Azure Site Recovery reliability documentation - https://learn.microsoft.com/en-us/azure/reliability/reliability-site-recovery

## Issues Found
- The Recovery Services vault ARM creation example put `sku` inside `properties`, which is not the full ARM resource shape. Changed the example to use `--is-full-object` with top-level `location`, `sku`, and `properties`.
- The VM replication section used `az site-recovery vmware-site create` while describing Azure-to-Azure VM replication. Removed the VMware-site command and replaced the protected item example with the Azure-to-Azure `a2a` provider-details shape documented by the current Site Recovery CLI.
- The replication policy example used REST-style property names in a CLI shorthand parameter. Updated it to use Site Recovery CLI shorthand for the A2A provider input.
- The recovery plan JSON was not a directly runnable Azure CLI example and included action details that are normally attached through recovery plan customization. Replaced it with the documented `az site-recovery recovery-plan create` command shape and noted that runbook post-actions are added to the plan separately.
- The Azure SQL failover group command created a failover group but did not add any databases. Added `--add-db myappdb` so the example actually protects a database.
- The Cosmos DB failover example did not state that failover priorities must match the account's existing replicated regions. Added that caveat.
- The DNS failover section implied that Traffic Manager and Azure Front Door both update DNS to a secondary region. Clarified that Traffic Manager is DNS-based and Front Door performs edge origin failover.
- The test failover command used a nonexistent `az site-recovery recovery-plan planned-failover` command and described it as a test failover. Replaced it with the documented Az.RecoveryServices PowerShell `Start-AzRecoveryServicesAsrTestFailoverJob` flow for a recovery plan.
- The Azure Automation runbook parameter treated `RecoveryPlanContext` as a JSON string. Updated it to the documented object parameter form and removed the unnecessary JSON conversion.

## Review Notes
The local environment does not have Azure CLI installed, so command verification was performed against official Microsoft Learn CLI and PowerShell references rather than local `az --help` output. Some Site Recovery examples still use placeholder resource IDs and assume fabrics, containers, policies, staging storage, target networks, and replicated disks already exist.
