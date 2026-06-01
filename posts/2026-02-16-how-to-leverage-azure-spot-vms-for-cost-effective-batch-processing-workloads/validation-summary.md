# Validation Summary: How to Leverage Azure Spot VMs for Cost-Effective Batch Processing Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Spot Virtual Machines
- Azure Virtual Machine Scale Sets
- Azure Batch
- Azure Scheduled Events / Instance Metadata Service
- Azure Retail Prices API
- Azure Resource Graph
- Azure CLI
- Python
- Azure Blob Storage SDK for Python

## Sources Consulted
- Azure Spot Virtual Machines documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms
- Azure CLI Spot VM documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/spot-cli
- Azure Scheduled Events documentation for Linux VMs: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/scheduled-events
- Azure Scheduled Events overview: https://learn.microsoft.com/en-us/azure/virtual-machines/scheduled-events-overview
- Azure VMSS Spot Priority Mix documentation: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/spot-priority-mix
- Azure VMSS Spot documentation: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/use-spot
- Azure Batch Spot VM documentation: https://learn.microsoft.com/en-us/azure/batch/batch-spot-vms
- Azure Batch nodes and pools documentation: https://learn.microsoft.com/en-us/azure/batch/nodes-and-pools
- Azure CLI Batch pool reference: https://learn.microsoft.com/en-us/cli/azure/batch/pool
- Azure Retail Prices API documentation: https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices

## Issues Found
- The Spot pricing command used an unsupported `Microsoft.Compute/locations/.../spotPriceHistory` REST path. Replaced it with the official Azure Retail Prices API and a filter for Spot meters.
- The Azure portal path for historical Spot pricing was inaccurate. Updated it to describe the documented **View pricing history** / **See all sizes** flow used when selecting VM sizes.
- The checkpointing Python snippet used `time.time()` without importing `time`. Added the missing import.
- The mixed regular/Spot VMSS example tried to create a regular VMSS and then change `virtualMachineProfile.priority` to Spot. Replaced it with the documented Spot Priority Mix flags: `--priority Spot`, `--regular-priority-count`, and `--regular-priority-percentage`.
- The eviction-rate monitoring command queried Activity Log for an undocumented `preempt/action` operation. Replaced it with the documented Azure Resource Graph `SpotResources` query for Spot eviction rates.
- The example pricing table was stale relative to current Azure Retail Prices API results for East US Linux VM meters. Updated the Spot prices and savings percentages.

## Review Notes
The Azure CLI was not installed in the local workspace, so CLI flags were verified against Microsoft Learn CLI/reference documentation rather than local `az --help`. The price table remains approximate because Azure Spot prices fluctuate by region, SKU, OS, and time.
