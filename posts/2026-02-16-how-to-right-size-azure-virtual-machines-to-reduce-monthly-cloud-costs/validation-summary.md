# Validation Summary: How to Right-Size Azure Virtual Machines to Reduce Monthly Cloud Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Virtual Machines
- Azure Advisor
- Azure Monitor metrics
- Azure Monitor Agent and Log Analytics
- Kusto Query Language (KQL)
- Azure CLI
- Azure Retail Prices API
- Azure Update Manager

## Sources Consulted
- Azure Advisor cost recommendations: https://learn.microsoft.com/en-us/azure/advisor/advisor-cost-recommendations
- Microsoft Cost Management recommendations tutorial: https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-opt-recommendations
- Azure VM monitoring data reference: https://learn.microsoft.com/en-us/azure/virtual-machines/monitor-vm-reference
- Azure Monitor Agent performance counter collection: https://learn.microsoft.com/en-us/azure/azure-monitor/vm/data-collection-performance
- Azure Monitor Perf table example queries: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/perf
- Azure VM B-series documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/b-family
- Azure VM resize documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm
- Azure CLI `az advisor recommendation` documentation: https://learn.microsoft.com/en-us/cli/azure/advisor/recommendation
- Azure CLI `az vm` documentation: https://learn.microsoft.com/en-us/cli/azure/vm
- Azure CLI `az monitor metrics` documentation: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Azure Retail Prices API documentation: https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices
- Azure Update Manager overview: https://learn.microsoft.com/en-us/azure/update-center/overview

## Issues Found
- The post stated that Azure Advisor uses fixed default thresholds of average CPU below 5% and average network utilization below 7 MB over 7 days. Current Advisor right-sizing guidance is more nuanced and includes CPU, memory, and outbound network utilization, with specific shutdown criteria and configurable lookback periods. I updated the wording to distinguish current Advisor behavior from the older low-utilization threshold guidance.
- The memory KQL example said it showed available memory but queried `% Used Memory`. I changed it to use the documented Perf counters `Available MBytes Memory` and `Available MBytes`, and updated the summarized fields accordingly.
- The post used `az vm list-skus` to get the current VM price. That command returns compute SKU metadata, not retail pricing. I replaced it with a Retail Prices API `curl` example filtered to the East US Linux pay-as-you-go `Standard_D4s_v5` meter.
- The post referenced Azure Update Management. I changed this to Azure Update Manager, which is the current Azure service for update scheduling and coordination.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI syntax was checked against Microsoft Learn documentation rather than local `az --help` output.
- The live Azure Retail Prices API returned `Standard_D4s_v5` Linux pay-as-you-go in East US at 0.192 USD/hour, which supports the post's approximate `$140/month` example when using roughly 730 hours/month.
