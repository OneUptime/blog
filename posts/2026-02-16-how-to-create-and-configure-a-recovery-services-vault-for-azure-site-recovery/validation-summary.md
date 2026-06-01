# Validation Summary: How to Create and Configure a Recovery Services Vault for Azure Site Recovery

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Site Recovery
- Azure Recovery Services vaults
- Azure Backup
- Azure CLI
- Azure Bicep / ARM resources
- Azure RBAC
- Azure Monitor alerts and action groups
- Azure Private Link / private endpoints

## Sources Consulted
- Azure Site Recovery reliability guidance: https://learn.microsoft.com/en-us/azure/reliability/reliability-site-recovery
- Azure Backup Recovery Services vault creation guidance: https://learn.microsoft.com/en-us/azure/backup/backup-create-recovery-services-vault
- Azure CLI `az backup vault` reference: https://learn.microsoft.com/en-us/cli/azure/backup/vault
- Azure CLI `az backup vault backup-properties` reference: https://learn.microsoft.com/en-us/cli/azure/backup/vault/backup-properties
- Azure Recovery Services vault REST API reference: https://learn.microsoft.com/en-us/rest/api/recoveryservices/vaults/create-or-update
- Bicep/ARM reference for `Microsoft.RecoveryServices/vaults`: https://learn.microsoft.com/en-us/azure/templates/microsoft.recoveryservices/vaults
- Azure Site Recovery RBAC guidance: https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-role-based-linked-access-control
- Azure Site Recovery private endpoint guidance: https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-how-to-enable-replication-private-endpoints
- Azure Private Endpoint DNS reference: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Azure Site Recovery monitoring and built-in alerts: https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-monitor-and-troubleshoot
- Azure Monitor supported metrics for Recovery Services vaults: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-recoveryservices-vaults-metrics
- Azure CLI `az monitor action-group` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/action-group
- Azure CLI `az monitor alert-processing-rule` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/alert-processing-rule

## Issues Found
- The post said the Recovery Services vault holds Site Recovery replication data. Updated this to say the vault stores Site Recovery configuration metadata; Microsoft documents that the vault does not store replicated VM data.
- The region guidance said the vault must always be in a different region than protected VMs. Updated this to Microsoft’s Azure-to-Azure recommendation: deploy the vault in the target region, while noting that Site Recovery can also support zone-to-zone scenarios.
- The Azure paired-region explanation described region pairs as optimized for low-latency replication. Updated this to the documented rationale around resiliency, data residency, and coordinated platform updates.
- The storage replication section implied vault redundancy controls Site Recovery replicated VM data. Updated it to clarify that vault storage redundancy applies to Azure Backup data and is not used for Site Recovery replication.
- The prerequisites implied Contributor access was sufficient for all steps. Updated this to distinguish vault creation permissions from the Owner/User Access Administrator permissions required for role assignments.
- Removed the `az recoveryservices vault create` alternative from the CLI example because the current official Azure CLI vault creation reference documents `az backup vault create`.
- Updated the Bicep SKU example to use `name: 'Standard'`, matching current Microsoft examples for Recovery Services vault creation.
- Corrected the private endpoint DNS guidance from public wildcard service domains to the private DNS zones documented for Site Recovery and Storage private endpoints.
- Replaced the `RPOInSeconds` metric alert example. Microsoft’s supported Recovery Services vault metrics list does not include a Site Recovery RPO metric, and Site Recovery built-in alerts are routed through Azure Monitor alert processing rules instead.

## Review Notes
- The Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI references rather than local `az --help` output.
- The `az monitor alert-processing-rule` command group is currently documented as a preview Azure CLI extension command.
