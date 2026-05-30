# Validation Summary: How to Use Spot Instances with Azure VM Scale Sets for Cost Savings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Spot Virtual Machines
- Azure Virtual Machine Scale Sets
- Azure CLI
- Azure Instance Metadata Service Scheduled Events
- Azure Monitor autoscale and metric alerts
- Azure Retail Prices API
- Bash, systemd, Node.js/Express

## Sources Consulted
- Microsoft Learn: Create a scale set that uses Azure Spot Virtual Machines - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/use-spot
- Microsoft Learn: Build workloads on Azure Spot Virtual Machines - https://learn.microsoft.com/en-us/azure/architecture/guide/spot/spot-eviction
- Microsoft Learn: Azure Metadata Service Scheduled Events - https://learn.microsoft.com/en-us/azure/virtual-machines/windows/scheduled-events
- Microsoft Learn: Azure CLI `az vmss` reference - https://learn.microsoft.com/en-us/cli/azure/vmss
- Microsoft Learn: Azure CLI `az monitor autoscale rule` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale/rule
- Microsoft Learn: Azure CLI `az monitor metrics alert` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Supported metrics for Microsoft.Compute/virtualMachineScaleSets - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-compute-virtualmachinescalesets-metrics
- Microsoft Learn: Create a scale set using instance mix - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/instance-mix-create
- Microsoft Learn: Azure Retail Prices REST API overview - https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices

## Issues Found
- The Spot pricing example used `az vm list-skus`, which lists SKU availability and restrictions but does not return current or historical Spot prices. Replaced it with a query against the Azure Retail Prices API for the current Spot retail price, while keeping the portal recommendation for historical pricing and eviction rates.
- The Scheduled Events monitor reacted to any `Preempt` event visible to the placement group. Microsoft documents that scale set scheduled events can be delivered to other VMs in the placement group, so the script now checks the event `Resources` list against the current VM name before draining the instance.
- The instance mix ARM snippet described multiple VM sizes but did not include `sku.name: "Mix"` or `skuProfile.vmSizes`. Added the required instance mix fields and a valid allocation strategy.
- The metric alert example used `--action-group`, which is not a valid `az monitor metrics alert create` parameter. Changed it to `--action`.
- The metric alert example used `count VmAvailabilityMetric < 1`, but `VmAvailabilityMetric` supports Average, Minimum, and Maximum aggregations. Changed the condition to `min VmAvailabilityMetric < 1`.
- The alert description claimed it detected eviction events directly. The VM availability metric reports availability drops, which can include Spot eviction effects, so the wording was narrowed to availability drops.

## Review Notes
Azure CLI was not installed in the local environment, so CLI validation was performed against the official Microsoft Learn CLI reference rather than local `az --help` output. The post's recommendation to use autoscale with Spot scale sets is technically correct, and Microsoft specifically recommends using autoscale with the `Delete` eviction policy to avoid disk charges and quota issues.
