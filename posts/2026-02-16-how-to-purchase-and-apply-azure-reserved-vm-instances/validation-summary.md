# Validation Summary: How to Purchase and Apply Azure Reserved VM Instances

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Reserved VM Instances
- Azure Virtual Machines
- Azure Cost Management and Billing
- Azure CLI
- Azure Hybrid Benefit

## Sources Consulted
- Microsoft Learn: What are Azure Reservations? https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/save-compute-costs-reservations
- Microsoft Learn: Buy an Azure reservation https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/prepare-buy-reservation
- Microsoft Learn: How the Azure reservation discount is applied to virtual machines https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/understand-vm-reservation-charges
- Microsoft Learn: Azure reservation recommendations https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/reserved-instance-purchase-recommendations
- Microsoft Learn: View reservation utilization after purchase https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/reservation-utilization
- Microsoft Learn: Self-service exchanges and refunds for Azure Reservations https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/exchange-and-refund-azure-reservations
- Microsoft Learn: Azure CLI `az reservations reservation-order` reference https://learn.microsoft.com/en-us/cli/azure/reservations/reservation-order?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vm list` reference https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest

## Issues Found
- The post stated that upfront payment gives a slightly better reservation rate than monthly payment. Microsoft documentation says the total cost of upfront and monthly reservations is the same, so the savings table and explanation were corrected.
- The portal purchase options listed "upfront plus monthly" billing. Current Azure reservation documentation and CLI options list upfront or monthly billing, so the extra option was removed.
- The Azure CLI purchase command used `--sku-name` and `--billing-scope-id`, which do not match the current `az reservations reservation-order purchase` parameters. The command was updated to use `--sku`, `--billing-scope`, and `--billing-plan Monthly`.
- The instance size flexibility explanation said the ratio is based on vCPU count within the same series and implied a separate Windows-specific enablement rule. Microsoft describes the ratio as a relative footprint within an instance size flexibility group, and the VM infrastructure discount behavior applies to both Linux and Windows VMs. The wording was corrected.
- The cancellation section said refunds are reduced by a 12% early termination fee and described a lifetime $50,000 refund limit. Microsoft documentation says early termination fees are not currently charged, a 12% fee might apply in the future, and the $50,000 limit is a 12-month rolling window for the billing profile or EA enrollment. The section was updated.

## Review Notes
The Azure CLI `reservations` command group is documented as preview, and the local environment did not have the `az` executable installed, so command verification was performed against the official Microsoft Learn CLI reference rather than local `--help` output.
