# Validation Summary: How to Move an Azure Virtual Machine to a Different Subscription

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microsoft Azure Virtual Machines
- Azure Resource Manager resource moves
- Azure subscriptions and Microsoft Entra ID tenants
- Azure CLI
- Azure networking resources
- Azure Backup
- Azure managed identities
- Azure Disk Encryption
- Azure RBAC and resource locks

## Sources Consulted
- Microsoft Learn: Move Azure resources to a new resource group or subscription - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/move-resource-group-and-subscription
- Microsoft Learn: Move Azure resources across resource groups, subscriptions, or regions - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/move-resources-overview
- Microsoft Learn: Azure virtual machine move and migration FAQ - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/move-vm-resources-faq
- Microsoft Learn: Move fails with MissingMoveDependentResources error - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/move-resources-missing-dependencies
- Microsoft Learn: Handling special cases when moving virtual machines to resource group or subscription - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/move-limitations/virtual-machines-move-limitations
- Microsoft Learn: Azure resource move fails because the VM is configured with Azure Backup - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/move-resources-backup-error
- Microsoft Learn: Azure resource types for move operations - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/move-support-resources
- Microsoft Learn: az resource CLI reference - https://learn.microsoft.com/en-us/cli/azure/resource
- Microsoft Learn: az provider CLI reference - https://learn.microsoft.com/en-us/cli/azure/provider
- Microsoft Learn: az vm CLI reference - https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: az monitor activity-log CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log

## Issues Found
- The post said Microsoft recommends deallocating the VM and implied downtime behavior in a way that did not match current Microsoft guidance. Updated the wording to say deallocation is not required for standard moves and that running VMs can continue serving traffic during the move, while still noting deallocation as a conservative maintenance-window choice for configurations that require it.
- The prerequisites listed Microsoft.Storage as a minimum provider for all VM moves. Updated this to clarify that Microsoft.Storage is needed for unmanaged disks or storage-account-backed features such as boot diagnostics, while Microsoft.Compute and Microsoft.Network are the common minimum providers.
- The VNet dependency guidance incorrectly said a shared VNet could not be moved and suggested reconfiguring the NIC after the move. Updated the guidance to match Azure Resource Manager dependency rules: the VNet dependency chain must move together or already exist in the destination, and changing a VM's VNet attachment is not part of the standard move operation.
- The move command example omitted the VNet resource even though the surrounding text discusses moving dependent networking resources. Added the VNet resource ID to the example move request.
- The Azure Backup section described deleting or keeping recovery points too loosely. Updated it to specify stopping backup, retaining backup data when needed, and deleting restore point collections that block the move, with a soft-delete caveat.
- The managed identity section incorrectly said user-assigned managed identities can be moved with the VM. Updated it to state that user-assigned managed identity resources do not support resource group or subscription move operations.
- The Azure Disk Encryption section was incomplete for cross-subscription moves. Updated it to state that ADE-enabled VMs must have encryption disabled before moving to another subscription, and that Key Vaults used for disk encryption cannot be moved while disk encryption is enabled.

## Review Notes
The Azure CLI command shapes for `az account list`, `az provider list/register`, `az vm list-usage`, `az resource invoke-action`, `az resource move`, `az vm deallocate/start`, and `az monitor activity-log list` match current official CLI documentation. The local environment did not have Azure CLI installed, so command behavior was verified against Microsoft Learn rather than local `az --help` output.
