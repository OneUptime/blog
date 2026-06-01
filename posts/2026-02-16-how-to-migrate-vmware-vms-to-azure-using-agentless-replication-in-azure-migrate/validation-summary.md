# Validation Summary: How to Migrate VMware VMs to Azure Using Agentless Replication in Azure Migrate

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Migrate
- Azure Migrate: Discovery and assessment
- Azure Migrate: Migration and modernization
- VMware vSphere and vCenter Server
- VMware PowerCLI
- Azure CLI and Azure Resource Manager REST API
- Az.Migrate PowerShell module
- Azure managed disks, VNets, and Azure VMs

## Sources Consulted
- Microsoft Learn: Migrate VMware VMs agentless with the Migration and modernization tool: https://learn.microsoft.com/en-us/azure/migrate/tutorial-migrate-vmware
- Microsoft Learn: Agentless replication of VMware virtual machines: https://learn.microsoft.com/en-us/azure/migrate/concepts-vmware-agentless-migration
- Microsoft Learn: Support matrix for VMware vSphere migration: https://learn.microsoft.com/en-us/azure/migrate/migrate-support-matrix-vmware-migration
- Microsoft Learn: Create an Azure Migrate project: https://learn.microsoft.com/en-us/azure/migrate/create-project
- Microsoft Learn: Azure Migrate appliance for VMware discovery and assessment: https://learn.microsoft.com/en-us/azure/migrate/vmware/how-to-set-up-appliance-vmware
- Microsoft Learn: Azure CLI `az migrate` reference: https://learn.microsoft.com/en-us/cli/azure/migrate
- Microsoft Learn: Az.Migrate `Get-AzMigrateServerMigrationStatus`: https://learn.microsoft.com/en-us/powershell/module/az.migrate/get-azmigrateservermigrationstatus
- Broadcom Developer: PowerCLI `Get-OvfConfiguration`: https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/get-ovfconfiguration
- Broadcom Developer: PowerCLI `Import-VApp`: https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/import-vapp

## Issues Found
- The post stated VMware agentless migration worked with vSphere 6.0+. Current Microsoft documentation lists vCenter Server and ESXi 6.5, 6.7, 7.0, and 8.0 for agentless VMware migration, so the version requirement was updated.
- The post said agentless replication only works with VMware and that Hyper-V requires the agent-based approach. Azure Migrate supports a separate agentless path for Hyper-V, so the text now distinguishes the VMware-specific workflow from Hyper-V and physical server migration.
- The prerequisites understated VMware and Azure permissions. The post now identifies the required Azure Migrate roles and key VMware replication privileges instead of read-only plus snapshots.
- The `az migrate project create`, `az migrate assessment list`, and `az migrate assessment create` examples were not valid current Azure CLI commands. The project creation example was changed to the documented ARM REST API through `az rest`, discovery status now uses the current preview `az migrate get-discovered-server` command, and assessment creation was changed to the documented portal workflow.
- The appliance download steps used older portal wording. They were updated to the current "Servers, databases and web apps" and "Azure Migrate: Discovery and assessment" flow.
- The discovery cadence was inaccurate. The post now reflects Microsoft's documented metadata, performance, and software inventory collection frequencies.
- The assessment limits were imprecise. The disk-count and disk-size bullets now distinguish data disk count, OS disk size, and data disk size limits.
- The replication-cycle explanation said delta replication runs every 5 minutes by default. Microsoft documents a scheduling window of at least 1 hour and at most 12 hours after the first delta cycle, so that section was corrected.
- The replication monitoring command queried an incorrect resource shape and status. It was replaced with the documented `Get-AzMigrateServerMigrationStatus` cmdlet and the expected `DeltaReplication Completed` state.
- The cutover step described shutting down the source VM as optional. Microsoft states the VM must be shut down before migration to avoid data loss, so the wording was corrected. The post-migration cleanup now includes completing the migration in Azure Migrate to remove replication resources.

## Review Notes
The remaining PowerCLI deployment example is syntactically aligned with Broadcom's `Get-OvfConfiguration` and `Import-VApp` documentation, but real deployments may need OVA-specific network mapping names that differ from `VM_Network`.
