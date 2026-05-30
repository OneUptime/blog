# Validation Summary: How to Use Azure Reserved Instances to Save Up to 72% on Compute Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Reserved VM Instances
- Azure Reservations
- Azure Advisor
- Azure CLI
- Azure Cost Management
- Azure Hybrid Benefit

## Sources Consulted
- Microsoft Learn: What are Azure Reservations? https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/save-compute-costs-reservations
- Microsoft Learn: Buy an Azure reservation https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/prepare-buy-reservation
- Microsoft Learn: Reservation recommendations https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/reserved-instance-purchase-recommendations
- Microsoft Learn: How the Azure reservation discount is applied to virtual machines https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/understand-vm-reservation-charges
- Microsoft Learn: Virtual machine size flexibility with Reserved VM Instances https://learn.microsoft.com/en-us/azure/virtual-machines/reserved-vm-instance-size-flexibility
- Microsoft Learn: Azure CLI az reservations reservation-order https://learn.microsoft.com/en-us/cli/azure/reservations/reservation-order
- Microsoft Learn: Azure CLI az reservations catalog https://learn.microsoft.com/en-us/cli/azure/reservations/catalog
- Microsoft Learn: Azure CLI az consumption reservation summary https://learn.microsoft.com/en-us/cli/azure/consumption/reservation/summary
- Microsoft Learn: Azure CLI az advisor recommendation https://learn.microsoft.com/en-us/cli/azure/advisor/recommendation
- Microsoft Learn: View reservation utilization after purchase https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/reservation-utilization
- Microsoft Learn: Reservation utilization alerts https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/reservation-utilization-alerts
- Microsoft Learn: Self-service exchanges and refunds for Azure Reservations https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/exchange-and-refund-azure-reservations
- Microsoft Learn: Explore Azure Hybrid Benefit for Windows VMs https://learn.microsoft.com/en-us/azure/virtual-machines/windows/hybrid-use-benefit-licensing

## Issues Found
- The post described three payment options, including "no upfront", and said upfront had a higher discount than monthly. Microsoft documents only upfront and monthly payment options for reservations, with the same total reservation cost and no extra fee for monthly payments. Updated the payment language.
- The Azure Advisor recommendation explanation said Advisor analyzes only the past 30 days. Microsoft documents reservation recommendation lookback periods of 7, 30, and 60 days, with Advisor recommendations scoped to a single subscription. Updated the explanation.
- The Azure CLI reservation purchase example omitted useful parameters for VM reservations. Added `--reserved-resource-type VirtualMachines`, `--billing-plan Monthly`, and `--instance-flexibility On` to match the documented reservation purchase command options.
- The utilization command used `az consumption reservation-summary list`, which is not the documented command group. Changed it to `az consumption reservation summary list`.
- The post said Azure sends email notifications automatically when utilization drops below 80%. Microsoft documents configurable reservation utilization alerts with target utilization percentages. Updated the wording.
- The exchange guidance said reservations could be exchanged within the same or lesser value. Microsoft documents that the new reservation must have a total lifetime commitment equal to or greater than the remaining commitment of the returned reservation. Updated the exchange wording.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI reference documentation instead of local `az --help` output.
