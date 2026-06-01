# Validation Summary: How to Configure Proximity Placement Groups for Low-Latency Azure VMs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Machines
- Azure Proximity Placement Groups
- Azure Availability Sets
- Azure Virtual Machine Scale Sets
- Azure CLI
- Azure availability zones
- sockperf

## Sources Consulted
- Microsoft Learn: Proximity placement groups - https://learn.microsoft.com/en-us/azure/virtual-machines/co-location
- Microsoft Learn: Azure CLI `az ppg` reference - https://learn.microsoft.com/en-us/cli/azure/ppg?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vm create` reference - https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vm availability-set create` reference - https://learn.microsoft.com/en-us/cli/azure/vm/availability-set?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vmss create` reference - https://learn.microsoft.com/en-us/cli/azure/vmss?view=azure-cli-latest
- Microsoft Learn: Proximity placement groups for Virtual Machine Scale Sets - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/proximity-placement-groups
- Microsoft Learn: Configuration options to minimize network latency with SAP applications - https://learn.microsoft.com/en-us/azure/sap/workloads/proximity-placement-scenarios
- Microsoft Learn: Proximity Placement Groups REST API - https://learn.microsoft.com/en-us/rest/api/compute/proximity-placement-groups/create-or-update?view=rest-compute-2025-04-01

## Issues Found
- The post said Microsoft recommends PPGs for all SAP HANA deployments on Azure. Current SAP workload guidance is more specific: PPGs should be used only when needed for latency-sensitive scenarios, and Microsoft now recommends avoiding PPG limitations where zonal deployment or flexible scale set designs satisfy latency needs. Updated the SAP HANA guidance accordingly.
- The post said PPGs should not be combined with availability zones. Microsoft documentation supports using PPGs with an availability zone when all resources are in the same zone, while noting that one PPG cannot span zones. Updated the trade-off and best-practice text to reflect this.
- The post said `--type Standard` is the only option currently available. Azure CLI and REST documentation expose `Standard` and `Ultra`, with `Ultra` marked for future use. Updated the wording to explain that `Standard` is the normal usable option.

## Review Notes
The Azure CLI commands use current documented parameters, including `--ppg` for VMs, availability sets, and scale sets, and `--include-colocation-status` for `az ppg show`. Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI reference pages rather than local `az --help` output.
