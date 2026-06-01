# Validation Summary: How to Fix 'SkuNotAvailable' Errors When Creating Azure Virtual Machines

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Virtual Machines
- Azure VM SKUs and availability zones
- Azure CLI
- Azure Quotas
- Azure Resource Graph
- Bash automation

## Sources Consulted
- Microsoft Learn: Resolve errors for SKU not available - https://learn.microsoft.com/en-us/azure/azure-resource-manager/troubleshooting/error-sku-not-available
- Microsoft Learn: Azure CLI `az vm list-skus`, `az vm list-usage`, and `az vm create` reference - https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: Azure CLI `az quota` reference - https://learn.microsoft.com/en-us/cli/azure/quota
- Microsoft Learn: Resource Skus - List REST API - https://learn.microsoft.com/en-us/rest/api/compute/resource-skus/list
- Microsoft Learn: Check vCPU quotas - https://learn.microsoft.com/en-us/azure/virtual-machines/quotas
- Microsoft Learn: Increase VM-family vCPU quotas - https://learn.microsoft.com/en-us/azure/quotas/per-vm-quota-requests
- Microsoft Learn: Azure CLI `az graph query` reference - https://learn.microsoft.com/en-us/cli/azure/graph

## Issues Found
- The `az vm list-skus` examples filtered unrestricted SKUs with `restrictions==null`, but the Compute SKU API returns unrestricted SKUs as `restrictions: []`. Updated those filters to use `length(restrictions)==\`0\``.
- The specific-SKU restriction examples omitted `--all`, but Azure CLI hides restricted SKUs by default. Added `--all` so restrictions can actually be inspected.
- The restriction details query used `values[*].name`, but `restrictions[].values` is an array of strings. Changed it to `values`.
- The zone-check command only displayed supported zones, which can be misleading when a SKU has zone restrictions. Updated it to use `--zone --all --output table` and clarified that restricted zones should be avoided.
- The post said `reasonCode` distinguishes subscription blocks from capacity constraints. Official values are `NotAvailableForSubscription` and `QuotaId`, so the explanation was corrected.
- The quota section described `az quota create` as opening a support request and gave a specific approval time. Updated the wording to match Azure's adjustable and non-adjustable quota model.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI references and Azure REST API documentation instead of local `az --help` output.
