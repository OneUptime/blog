# Validation Summary: How to Deploy Azure Spot Virtual Machines to Reduce Compute Costs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Spot Virtual Machines
- Azure Virtual Machine Scale Sets
- Azure CLI
- Azure Retail Prices API
- Azure Instance Metadata Service Scheduled Events
- Bash and curl

## Sources Consulted
- Microsoft Learn: Use CLI to deploy Azure Spot Virtual Machines - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/spot-cli
- Microsoft Learn: Create a scale set that uses Azure Spot Virtual Machines - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/use-spot
- Microsoft Learn: Spot Priority Mix for Virtual Machine Scale Sets - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/spot-priority-mix
- Microsoft Learn: Scheduled Events for Azure Virtual Machines - https://learn.microsoft.com/en-us/azure/virtual-machines/scheduled-events-overview
- Microsoft Learn: Azure Retail Prices REST API overview - https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices
- Microsoft Learn: Virtual Machines REST API definitions for Spot VM billing profile and eviction policy - https://learn.microsoft.com/en-us/rest/api/compute/virtual-machines/get
- Microsoft Azure: Spot Virtual Machines pricing and features - https://azure.microsoft.com/en-us/pricing/spot/
- Azure Retail Prices API live query for Standard_D4s_v5 in East US - https://prices.azure.com/api/retail/prices

## Issues Found
- The Spot price example used an undocumented `Microsoft.Compute/locations/eastus/spotPriceHistory` management endpoint. Replaced it with the documented Azure Retail Prices API query for current Spot prices and clarified that historical pricing is available in the Azure portal.
- The VMSS section stated that a scale set automatically replaces evicted Spot VMs with only `--eviction-policy Delete`. Updated the command to enable Spot restore and updated the explanation to say the scale set tries to restore instances when capacity is available.
- The mixed Spot and regular VMSS example omitted `--orchestration-mode Flexible`, which is the documented orchestration mode for Spot Priority Mix. Added the flag.
- The Delete eviction policy explanation said all VM resources are deleted. Narrowed this to the VM and underlying disks to avoid overclaiming deletion of associated resources such as networking resources.
- The cost comparison table had stale reserved and Spot price examples. Updated the rough Standard_D4s_v5 East US figures using the Azure Retail Prices API and softened the wording about worst-case Spot savings.
- The eviction rate monitoring section used an undocumented `spotEvictionRates` REST endpoint. Replaced it with the documented Azure portal guidance for viewing pricing history and eviction rates.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI flags were verified against Microsoft Learn rather than local `az --help`.
- Spot prices are dynamic and can change by region, VM size, OS/license, and time. The cost table remains an example, not a guaranteed price quote.
