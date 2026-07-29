# Validation Summary: Azure VM Quota vs Regional Capacity

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Microsoft Azure
- Azure Virtual Machines and Virtual Machine Scale Sets
- Azure compute vCPU quotas
- Azure regional and zonal capacity
- Azure CLI
- Azure Resource Manager deployments and deployment operations
- Availability sets and proximity placement groups
- On-demand Capacity Reservations

## Sources Consulted

- [Check vCPU quotas for Azure VMs](https://learn.microsoft.com/en-us/azure/virtual-machines/quotas)
- [Increase Spot vCPU quotas](https://learn.microsoft.com/en-us/azure/quotas/spot-quota)
- [Azure VM states and billing status](https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing)
- [Resolve resource quota errors](https://learn.microsoft.com/en-us/azure/azure-resource-manager/troubleshooting/error-resource-quota)
- [Troubleshoot Azure VM allocation failures](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/allocation-failure)
- [Troubleshoot VM restart and resize issues](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/restart-resize-error-troubleshooting)
- [Resolve SKU not available errors](https://learn.microsoft.com/en-us/azure/azure-resource-manager/troubleshooting/error-sku-not-available)
- [Azure CLI `az account` reference](https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest)
- [Azure CLI `az vm` reference](https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest)
- [Azure CLI resource-group deployment operations reference](https://learn.microsoft.com/en-us/cli/azure/deployment/operation/group?view=azure-cli-latest)
- [Request a quota increase in the Azure portal](https://learn.microsoft.com/en-us/azure/quotas/quickstart-increase-quota-portal)
- [Azure Quota Service REST API](https://learn.microsoft.com/en-us/rest/api/quota/)
- [Proximity placement groups](https://learn.microsoft.com/en-us/azure/virtual-machines/co-location)
- [On-demand Capacity Reservation overview](https://learn.microsoft.com/en-us/azure/virtual-machines/capacity-reservation-overview)
- [Create an on-demand Capacity Reservation](https://learn.microsoft.com/en-us/azure/virtual-machines/capacity-reservation-create)

## Issues Found

No technical issues found.

## Review Notes

All Azure CLI commands use current, non-deprecated command groups and valid options. The post correctly distinguishes quota from capacity, explains that allocated and deallocated VM cores count toward quota, qualifies `OperationNotAllowed` by requiring quota details, and notes that SKU listings do not guarantee live unreserved capacity. The availability-set, proximity-placement-group, and on-demand Capacity Reservation guidance matches the documented Azure behavior.
