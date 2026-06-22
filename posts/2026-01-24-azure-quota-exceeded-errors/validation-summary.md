# Validation Summary: How to Fix 'Quota Exceeded' Errors in Azure

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Microsoft Azure quotas and limits
- Azure CLI
- Azure PowerShell
- Azure Quota API and CLI extension
- Azure Resource Graph
- Azure Monitor alerts
- Azure SDK for Python
- Terraform
- Azure Pipelines

## Sources Consulted
- Microsoft Learn: Check vCPU quotas - https://learn.microsoft.com/en-us/azure/virtual-machines/quotas
- Microsoft Learn: Increase regional vCPU quotas - https://learn.microsoft.com/en-us/azure/quotas/regional-quota-requests
- Microsoft Learn: Azure Quotas overview - https://learn.microsoft.com/en-us/azure/quotas/quotas-overview
- Microsoft Learn: Create alerts for quotas - https://learn.microsoft.com/en-us/azure/quotas/how-to-guide-monitoring-alerting
- Microsoft Learn: Azure CLI `az quota` reference - https://learn.microsoft.com/en-us/cli/azure/quota
- Microsoft Learn: Azure CLI `az quota usage` reference - https://learn.microsoft.com/en-us/cli/azure/quota/usage
- Microsoft Learn: Azure CLI `az vm` reference - https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: Azure CLI `az network` reference - https://learn.microsoft.com/en-us/cli/azure/network
- Microsoft Learn: Azure Storage account overview and limits - https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview
- Microsoft Learn: Public IP addresses in Azure - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses
- Microsoft Learn: Azure SDK for Python `ComputeManagementClient` - https://learn.microsoft.com/en-us/python/api/azure-mgmt-compute/azure.mgmt.compute.computemanagementclient

## Issues Found
- The quota level diagram described "Total vCPUs per subscription"; Azure VM vCPU quotas are enforced per subscription and per region, with Total Regional vCPUs and VM-family vCPU tiers. Changed the example to a generic subscription-level resource count and kept VM-family cores as regional.
- The diagram described public IP quotas as subscription-only. Microsoft documentation states public IP limits are per region and per subscription. Changed the label to "Public IPs per region."
- The PowerShell percentage calculation could divide by zero for quota rows with a zero limit. Added a `Where-Object { $_.Limit -gt 0 }` guard before calculating percentages.
- The VM family comment called DSv4 the "Latest general purpose" family. That is time-sensitive and no longer reliable. Changed it to "General purpose."
- The storage account quota comment omitted the standard endpoint qualifier. Updated it to specify the default standard endpoint limit of 250 storage accounts per subscription per region.
- The Azure Monitor metric alert JSON used a quota `UsagePercent` metric under `Microsoft.Compute/locations`, which is not the documented quota alerting pattern. Replaced it with an Azure Resource Graph quota query suitable for a log search alert rule.
- The deallocated VM audit command filtered on `powerState`, but `az vm list` only includes power state when `--show-details` is used. Added `--show-details`.
- The Azure Pipelines JMESPath query attempted arithmetic inside `--query` with `[limit - currentValue]`, which is not valid Azure CLI JMESPath usage. Split the query into `CURRENT` and `LIMIT` values and performed the arithmetic in Bash.

## Review Notes
The Azure CLI `az quota` commands are part of the Azure CLI quota extension and require Azure CLI 2.54.0 or later; Microsoft documents that the extension is installed automatically on first use. The Azure Resource Graph quota alert examples currently focus on compute quota usage data.
