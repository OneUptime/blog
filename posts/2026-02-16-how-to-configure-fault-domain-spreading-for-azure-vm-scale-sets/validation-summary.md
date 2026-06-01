# Validation Summary: How to Configure Fault Domain Spreading for Azure VM Scale Sets

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure Virtual Machine Scale Sets
- VMSS Flexible and Uniform orchestration modes
- Azure fault domains and update domains
- Azure availability zones and zone balancing
- Azure CLI
- ARM templates / Microsoft.Compute virtualMachineScaleSets

## Sources Consulted
- Microsoft Learn: Choosing the right number of fault domains for Virtual Machine Scale Set - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-manage-fault-domains
- Microsoft Learn: Orchestration modes for Virtual Machine Scale Sets in Azure - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-orchestration-modes
- Microsoft Learn: Azure CLI `az vmss create` and `az vmss get-instance-view` reference - https://learn.microsoft.com/en-us/cli/azure/vmss
- Microsoft Learn: Microsoft.Compute/virtualMachineScaleSets ARM template reference for API version 2023-07-01 - https://learn.microsoft.com/en-us/azure/templates/microsoft.compute/2023-07-01/virtualmachinescalesets
- Microsoft Learn: Zone balancing in Virtual Machine Scale Sets - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-zone-balancing
- Microsoft Learn: Virtual Machines - Instance View REST API - https://learn.microsoft.com/en-us/rest/api/compute/virtual-machines/instance-view

## Issues Found
- The post described fault domains too narrowly as essentially a rack. Updated the wording to match Azure's definition of a hardware isolation group sharing power, networking, cooling, and platform maintenance characteristics.
- The post gave a generic "2-3 fault domains" and "up to 20 update domains" explanation that did not distinguish VM Scale Sets from availability sets. Updated the text to clarify that supported fault-domain and update-domain behavior depends on orchestration mode and deployment type.
- The post called the non-max mode "static spreading" and listed `platformFaultDomainCount = 2, 3, or 5` as if those values were generally valid. Updated it to "fixed spreading" and clarified current supported values for Flexible regional, Uniform regional, and Flexible zonal/zone-spanning deployments.
- The Azure CLI examples relied on the CLI default orchestration mode. Added `--orchestration-mode Flexible` so the examples match the article's recommendation explicitly.
- The availability-zone section stated that Azure distributes exactly three instances per zone and showed named fault domains in each zone. Updated this to best-effort zone balancing and implicit fault-domain spreading, because max-spread physical fault domains are not exposed as separate visible fault-domain values.
- The verification and monitoring sections implied that all VMSS deployments expose per-instance fault-domain placement. Updated those sections to distinguish fixed-spread/Uniform scenarios from max spreading, where Azure may show only one visible fault domain because the physical spreading is implicit.
- The regional versus zonal deployment section implied zonal deployments usually expose 2-3 fault domains per zone. Updated it to reflect that Flexible zonal and zone-spanning deployments only support `platformFaultDomainCount = 1`, with implicit spreading inside each zone.

## Review Notes
The ARM snippet uses a valid VMSS resource type, API version, and `properties.platformFaultDomainCount` field, but it is still a partial resource excerpt rather than a complete deployable template with networking and OS profile details. The Azure CLI was not installed locally, so CLI checks were performed against the current Microsoft Learn Azure CLI reference rather than local `az --help` output.
