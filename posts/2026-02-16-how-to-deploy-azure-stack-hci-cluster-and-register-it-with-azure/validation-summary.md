# Validation Summary: How to Deploy Azure Stack HCI Cluster and Register It with Azure

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Azure Stack HCI / Azure Local
- Azure Arc
- Hyper-V
- Storage Spaces Direct
- Failover Clustering
- Windows Admin Center
- Azure Monitor Agent
- Azure PowerShell

## Sources Consulted
- Microsoft Learn: Azure Local overview - https://learn.microsoft.com/en-us/azure/azure-local/overview
- Microsoft Learn: System requirements for Azure Local - https://learn.microsoft.com/en-us/azure/azure-local/concepts/system-requirements-23h2
- Microsoft Learn: Install the Azure Stack HCI operating system manually using SConfig - https://learn.microsoft.com/en-us/azure/azure-local/deploy/deployment-install-os
- Microsoft Learn: Assign required permissions for Azure Local deployment - https://learn.microsoft.com/en-us/azure/azure-local/deploy/deployment-arc-register-server-permissions
- Microsoft Learn: Register-AzStackHCI cmdlet - https://learn.microsoft.com/en-us/powershell/module/az.stackhci/register-azstackhci
- Microsoft Learn: Get-AzStackHciCluster cmdlet - https://learn.microsoft.com/en-us/powershell/module/az.stackhci/get-azstackhcicluster
- Microsoft Learn: Deploy Storage Spaces Direct - https://learn.microsoft.com/en-us/windows-server/storage/storage-spaces/deploy-storage-spaces-direct
- Microsoft Learn: Enable-ClusterStorageSpacesDirect cmdlet - https://learn.microsoft.com/en-us/powershell/module/failoverclusters/enable-clusterstoragespacesdirect
- Microsoft Learn: Azure Monitor Agent extension for Arc-enabled servers - https://learn.microsoft.com/en-us/azure/azure-monitor/vm/vm-enable-monitoring
- Microsoft Learn: az stack-hci CLI reference - https://learn.microsoft.com/en-us/cli/azure/stack-hci
- Microsoft Learn: Update Azure Local by using PowerShell - https://learn.microsoft.com/en-us/azure/azure-local/update/update-via-powershell-23h2
- Microsoft Learn: Manage Azure Local clusters with Windows Admin Center in Azure - https://learn.microsoft.com/en-us/windows-server/manage/windows-admin-center/azure/manage-hci-clusters

## Issues Found
- Updated the introduction to note that Azure Stack HCI is now part of Azure Local, matching current Microsoft terminology.
- Replaced the overly broad "Azure AD Global Administrator or Contributor role" prerequisite with current Microsoft Entra ID and Azure RBAC/Arc registration wording.
- Replaced `Get-AzStackHCI` with `Get-AzStackHciCluster -ResourceGroupName "myResourceGroup" -Name "HCI-Cluster"` because the current Az.StackHCI module exposes `Get-AzStackHciCluster` for registered cluster resources.
- Rewrote the Azure Monitor Agent extension example as PowerShell using `New-AzConnectedMachineExtension`; the previous block was fenced as PowerShell but used Azure CLI Bash continuations.
- Replaced the invalid `az stack-hci update run` command with the documented PowerShell `Get-SolutionUpdate` and `Start-SolutionUpdate` workflow.
- Updated the update-management wording from Azure Update Management to Azure Update Manager.
- Changed the maintenance update note to point to Azure portal or PowerShell solution update cmdlets, because current Azure Local update documentation does not recommend Windows Admin Center for solution updates.

## Review Notes
The post remains a legacy/manual deployment-style guide. Current Azure Local 23H2+ documentation emphasizes registering machines with Azure Arc and deploying through Azure portal or ARM templates, so a future larger rewrite should align the whole deployment flow with the modern Azure Local cloud deployment path.
