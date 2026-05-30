# Validation Summary: How to Set Up Disaster Recovery for Azure VMs to a Secondary Region

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Site Recovery
- Azure virtual machines
- Recovery Services vaults
- Azure managed disks
- Azure virtual networks and subnets
- Azure CLI
- Azure PowerShell Az.RecoveryServices

## Sources Consulted
- Microsoft Learn: Azure-to-Azure disaster recovery architecture in Azure Site Recovery - https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture
- Microsoft Learn: Disaster recovery for Azure VMs using Azure PowerShell and Azure Site Recovery - https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-powershell
- Microsoft Learn: Support Matrix for Azure VM Disaster Recovery with Azure Site Recovery - https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-support-matrix
- Microsoft Learn: Map virtual networks between two regions in Azure Site Recovery - https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-network-mapping
- Microsoft Learn: New-AzRecoveryServicesAsrAzureToAzureDiskReplicationConfig reference - https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/new-azrecoveryservicesasrazuretoazurediskreplicationconfig
- Microsoft Learn: New-AzRecoveryServicesAsrReplicationProtectedItem reference - https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/new-azrecoveryservicesasrreplicationprotecteditem
- Microsoft Learn: Run a test failover to Azure in Azure Site Recovery - https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-test-failover-to-azure
- Microsoft Learn: Understanding Azure Site Recovery for Managed Disks Charges - https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-cost

## Issues Found
- The prerequisites stated that unmanaged disks are not supported for Azure-to-Azure ASR. Microsoft documentation still describes Azure-to-Azure replication paths for unmanaged disks, while also noting that unmanaged disks are deprecated. I changed the wording to recommend managed disks for new deployments without making the incorrect absolute support claim.
- The Azure PowerShell sample used `$containerMapping` without showing how to retrieve it, and manually assembled resource IDs with a placeholder subscription ID. I updated the sample to retrieve the target resource group, virtual network, cache storage account, ASR fabric, protection container, and protection container mapping through Az cmdlets, then pass their actual IDs.
- The application-consistent recovery point description said applications do not need crash recovery. I softened this to say application-consistent points reduce recovery work when the application integration succeeds, which better matches Microsoft documentation.

## Review Notes
- The Azure CLI and PowerShell tools were not installed in the local environment, so command validation was performed against Microsoft Learn command references instead of local `--help` output.
- The PowerShell example still assumes that the vault setup guide has already created the ASR fabric, protection containers, replication policy, and protection container mapping, consistent with the post's prerequisite.
