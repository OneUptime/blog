# Validation Summary: How to Fail Back Azure VMs to the Primary Region After a Disaster Recovery Event

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Site Recovery
- Azure virtual machines
- Azure Recovery Services vaults
- Azure PowerShell Az.RecoveryServices
- Azure failover, failback, reprotection, and recovery plans

## Sources Consulted
- Microsoft Learn: Reprotect failed over Azure virtual machines to the primary region: https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-how-to-reprotect
- Microsoft Learn: Tutorial: Fail back Azure VM to the primary region: https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-failback
- Microsoft Learn: Set up disaster recovery for Azure virtual machines using Azure PowerShell: https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-powershell
- Microsoft Learn: Update-AzRecoveryServicesAsrProtectionDirection: https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/update-azrecoveryservicesasrprotectiondirection
- Microsoft Learn: Start-AzRecoveryServicesAsrPlannedFailoverJob: https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/start-azrecoveryservicesasrplannedfailoverjob
- Microsoft Learn: Get-AzRecoveryServicesAsrFabric: https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/get-azrecoveryservicesasrfabric
- Microsoft Learn: Get-AzRecoveryServicesAsrProtectionContainer: https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/get-azrecoveryservicesasrprotectioncontainer
- Microsoft Learn: Get-AzRecoveryServicesAsrProtectionContainerMapping: https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/get-azrecoveryservicesasrprotectioncontainermapping

## Issues Found
- The health-check script looked for the reverse-replication cache storage account in the primary region. Microsoft documents the cache storage account as being in the same region as the VM being replicated, so for failback reverse replication it should be in the DR region. Updated the example resource group and account name accordingly.
- The reprotection PowerShell example called `Get-AzRecoveryServicesAsrProtectionContainer` without the required `-Fabric` parameter. Added retrieval of the DR-region fabric before getting the protection container.
- The reprotection PowerShell example used `$reverseContainerMapping` without defining it. Added a `Get-AzRecoveryServicesAsrProtectionContainerMapping` call for the reverse mapping.
- The post stated that reprotection always performs a full initial replication. Microsoft documents that Azure Site Recovery usually transfers disk differentials when the source data is accessible, and does a full copy when the target VM and disks are unavailable. Updated the explanation.
- The post gave a fixed 1-4 hour estimate for a 256 GB VM. Microsoft documents that reprotection time depends on checksum calculation, differential transfer, recovery point processing, auto scaling, churn, and throughput. Replaced the unsupported fixed estimate with environment-dependent guidance.
- The planned failover PowerShell example used `-CreateVmErrorAction`, which is not a valid parameter for `Start-AzRecoveryServicesAsrPlannedFailoverJob`. Replaced it with the documented `-CreateVmIfNotFound "Yes"` parameter.
- The planned failover polling loop only handled `InProgress`. Updated it to continue polling while the job is either `NotStarted` or `InProgress`, matching the async job states used in Microsoft examples.
- The commit step said committing deletes the DR-region VMs. For Azure-to-Azure failback with managed disks, Microsoft documents cleanup after failback is complete and VMs are reprotected from primary to secondary, while unmanaged-disk VMs are not automatically cleaned up. Updated the cleanup statement.

## Review Notes
The guide is technically relevant and broadly aligned with the documented Azure-to-Azure failback flow: commit the original failover, reprotect from secondary to primary, fail back after synchronization completes, and reprotect again from primary to secondary. The PowerShell examples are still illustrative and assume the reader substitutes the correct fabric, protection container mapping names, resource IDs, and vault context for their environment.
