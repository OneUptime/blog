# Validation Summary: How to Create and Restore Snapshots of Azure Managed Disks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Managed Disks
- Azure snapshots and incremental snapshots
- Azure CLI
- Azure PowerShell Az module
- Azure SDK for Python
- Disaster recovery and disk restore workflows

## Sources Consulted
- Microsoft Learn: Azure CLI `az snapshot` reference: https://learn.microsoft.com/en-us/cli/azure/snapshot?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az disk` reference: https://learn.microsoft.com/en-us/cli/azure/disk?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vm disk` reference: https://learn.microsoft.com/en-us/cli/azure/vm/disk?view=azure-cli-latest
- Microsoft Learn: Create incremental snapshots for managed disks: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-incremental-snapshots
- Microsoft Learn: Copy an incremental snapshot to a new region: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-copy-incremental-snapshot-across-regions
- Microsoft Learn: Change the OS disk used by an Azure VM using the Azure CLI: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/os-disk-swap
- Microsoft Learn: Azure SDK for Python `ComputeManagementClient`: https://learn.microsoft.com/en-us/python/api/azure-mgmt-compute/azure.mgmt.compute.computemanagementclient?view=azure-python
- Microsoft Learn: Azure Compute Snapshots Create Or Update REST API: https://learn.microsoft.com/en-us/rest/api/compute/snapshots/create-or-update

## Issues Found
- The "How Snapshots Work" section implied that all subsequent snapshots are incremental. Updated it to distinguish full snapshots from incremental snapshots, because incremental behavior applies when incremental snapshots are used.
- The cross-region copy example used a regular snapshot copy command. Microsoft documents cross-region managed copy for incremental snapshots and states that full snapshots cannot be copied across regions. Updated the text and command to use an incremental snapshot with `--incremental true` and `--copy-start true`.
- The Python cleanup script used `datetime.utcnow()`, which creates naive datetimes and can fail when compared with timezone-aware SDK `time_created` values. Updated the script to use `datetime.now(timezone.utc)`.

## Review Notes
The remaining Azure CLI, PowerShell, disk restore, OS disk swap, and VM creation examples align with the current official command references. The Azure CLI was not installed in the local workspace, so command validation was performed against Microsoft Learn reference documentation rather than local `az --help` output.
