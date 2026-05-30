# Validation Summary: How to Use Azure Advisor Recommendations to Reduce Cloud Spending

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Advisor
- Azure Cost Management
- Azure Reservations / Reserved Instances
- Azure savings plans
- Azure CLI
- Kusto Query Language (KQL)
- Azure Monitor / Log Analytics performance counters

## Sources Consulted
- Microsoft Learn: Introduction to Azure Advisor - https://learn.microsoft.com/en-us/azure/advisor/advisor-overview
- Microsoft Learn: Azure Advisor cost recommendations - https://learn.microsoft.com/en-us/azure/advisor/advisor-reference-cost-recommendations
- Microsoft Learn: Optimize VM or VMSS spend by resizing or shutting down underutilized instances - https://learn.microsoft.com/en-us/azure/advisor/advisor-cost-recommendations
- Microsoft Learn: Advisor score - https://learn.microsoft.com/en-us/azure/advisor/azure-advisor-score
- Microsoft Learn: Azure reservation recommendations - https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/reserved-instance-purchase-recommendations
- Microsoft Learn: Choose a savings plan commitment amount - https://learn.microsoft.com/en-us/azure/cost-management-billing/savings-plan/choose-commitment-amount
- Microsoft Learn: Azure CLI `az advisor recommendation` reference - https://learn.microsoft.com/en-us/cli/azure/advisor/recommendation

## Issues Found
- The VM right-sizing section said Advisor flags VMs using average CPU below 5% over the past 14 days. Current Microsoft documentation describes separate shutdown and resize logic: shutdown recommendations use CPU and outbound network over the recent lookback period, while resize recommendations use CPU, memory, and outbound network. I updated the wording to avoid the incorrect threshold and fixed lookback claim.
- The review guidance said Advisor primarily looks at CPU and network for resizing. Current resize recommendations include memory, so I changed the guidance to say Advisor includes memory but users should still validate memory trends before resizing.
- The Reserved Instance section said Advisor identifies resources running consistently for the past 30 days. Microsoft documentation says reservation recommendation calculations evaluate 7-, 30-, and 60-day lookback periods, so I corrected that statement.
- The Advisor configuration section described changing the CPU threshold as changing recommendation behavior. Microsoft documentation says this setting filters which VM/VMSS right-sizing recommendations are shown; it does not change how recommendations are generated. I updated the wording and UI step.
- The Advisor Score section described the cost score as a count of implemented versus outstanding recommendations. Microsoft documentation says Cost score uses retail cost of assessed resources, healthy resource ratios, and other weights. I corrected the explanation.

## Review Notes
The Azure CLI command syntax and `--category Cost` option match the official Azure CLI reference. Azure CLI was not installed in the local environment, so command verification was performed against Microsoft Learn rather than local `az --help` output.
