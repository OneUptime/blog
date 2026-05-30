# Validation Summary: How to Set Up Ephemeral OS Disks on Azure Virtual Machines for Faster Boot Times

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Machines
- Azure VM Scale Sets
- Azure ephemeral OS disks
- Azure CLI
- ARM templates
- Azure managed disks
- AKS node OS disks
- fio and systemd-analyze benchmarking

## Sources Consulted
- Microsoft Learn: Ephemeral OS disks for Azure VMs - https://learn.microsoft.com/en-us/azure/virtual-machines/ephemeral-os-disks
- Microsoft Learn: FAQ Ephemeral OS disks - https://learn.microsoft.com/en-us/azure/virtual-machines/ephemeral-os-disks-faq
- Microsoft Learn: How to deploy Ephemeral OS disks for Azure VMs - https://learn.microsoft.com/en-us/azure/virtual-machines/ephemeral-os-disks-deploy
- Microsoft Learn: Azure CLI az vm reference - https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest
- Microsoft Learn: Azure CLI az vmss reference - https://learn.microsoft.com/en-us/cli/azure/vmss?view=azure-cli-latest
- Microsoft Learn: Azure managed disk types - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types
- Microsoft Learn: AKS storage concepts - https://learn.microsoft.com/azure/aks/concepts-storage
- Azure Retail Prices API - https://prices.azure.com/api/retail/prices

## Issues Found
- Corrected lifecycle wording around stop/deallocate, resize, redeploy, and service healing. Azure documentation states ephemeral OS disk VMs do not support the stop-deallocated state and that data is not preserved during redeploy, resize to a new VM size, or healing maintenance.
- Updated placement coverage from two placement options to three: cache disk, temp/resource disk, and NVMe disk. Azure now documents NVMe disk placement as generally available on supported v6 series.
- Replaced the deprecated `az vm list-sizes` example with `az vm list-skus` and queried the documented SKU capabilities for ephemeral OS disk support, local temp disk, cache bytes, and supported placements.
- Replaced unsupported `Standard_D4s_v5` examples with VM sizes that have the required local storage for the chosen placement, and added explicit `--ephemeral-os-disk-placement` values where needed.
- Added `--os-disk-caching ReadOnly` to the temp disk placement example, matching the Azure deployment documentation for ephemeral OS disks.
- Clarified that AKS defaults to ephemeral OS disks only when the selected node pool configuration supports them.
- Corrected the cost example for Standard SSD E10 LRS in East US from about $10.24/month to about $9.60/month before transaction charges, based on the Azure Retail Prices API, and updated the 50-instance savings math.
- Corrected the image capture limitation. Azure lists VM image capture as unsupported for ephemeral OS disks, so custom images should be built and captured from a VM with a persistent managed OS disk.

## Review Notes
The benchmark values are presented as typical examples rather than Azure guarantees. Actual boot time and fio results depend on VM size, placement, image, host storage, caching state, and workload configuration.
