# Validation Summary: How to Configure Replication Policies for RPO and Retention

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Site Recovery
- Azure Recovery Services vaults
- Azure-to-Azure replication policies
- Az.RecoveryServices PowerShell module
- Recovery points, RPO, retention, and multi-VM consistency

## Sources Consulted
- Microsoft Learn: Azure Site Recovery FAQ - https://learn.microsoft.com/en-au/azure/site-recovery/site-recovery-faq
- Microsoft Learn: Tutorial - Set up disaster recovery for Windows VMs with Azure Site Recovery - https://learn.microsoft.com/en-us/azure/virtual-machines/windows/tutorial-disaster-recovery
- Microsoft Learn: Configure and manage replication policies for VMware disaster recovery - https://learn.microsoft.com/en-us/azure/site-recovery/vmware-azure-set-up-replication
- Microsoft Learn: Replicate machines with Customer-Managed Keys enabled disks - https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-how-to-enable-replication-cmk-disks
- Microsoft Learn: Azure-to-Azure failover and failback overview - https://learn.microsoft.com/en-us/azure/site-recovery/failover-failback-overview-modernized
- Microsoft Learn: New-AzRecoveryServicesAsrPolicy - https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/new-azrecoveryservicesasrpolicy
- Microsoft Learn: Update-AzRecoveryServicesAsrPolicy - https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/update-azrecoveryservicesasrpolicy
- Microsoft Learn: Get-AzRecoveryServicesAsrPolicy - https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/get-azrecoveryservicesasrpolicy
- Microsoft Learn: Set-AzRecoveryServicesAsrReplicationProtectedItem - https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/set-azrecoveryservicesasrreplicationprotecteditem
- Microsoft Learn: Azure Site Recovery REST API replication protected item details - https://learn.microsoft.com/en-us/rest/api/site-recovery/replication-protected-items/apply-recovery-point

## Issues Found
- The introduction said replication policies configure both RPO and RTO. Replication policies configure recovery point retention and application-consistent snapshot frequency, not RTO directly. Updated the wording.
- The portal retention range was stated as 1-72 hours. Microsoft Azure VM documentation commonly describes 0-72 hours for Azure VM portal workflows, while managed-disk scenarios can support longer retention. Updated the wording to avoid an inaccurate universal range.
- The post said an already replicated VM can be switched to a new policy directly from the replicated item settings. Microsoft documentation describes editing the policy for existing replications, with some scenarios requiring disable/re-enable to associate a different policy. Updated the instructions.
- The multi-VM consistency PowerShell sample used unsupported `Set-AzRecoveryServicesAsrReplicationProtectedItem` parameters (`EnableMultiVMSync` and `MultiVMGroupName`). Replaced it with supported `New-AzRecoveryServicesAsrPolicy` and `Update-AzRecoveryServicesAsrPolicy` examples using `-MultiVmSyncStatus`.
- The RPO monitoring script calculated elapsed time since `LastRpoCalculatedTime` instead of using the actual RPO value. Updated the script to use `ProviderSpecificDetails.RpoInSeconds`.

## Review Notes
The post is technically relevant and code-bearing. Azure Site Recovery behavior varies by replication scenario, so future revisions should continue to call out whether examples are Azure-to-Azure, VMware-to-Azure, physical-to-Azure, or Azure VMware Solution-specific.
