# Validation Summary: How to Fix 'Scale Set' Deployment Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Virtual Machine Scale Sets
- Azure CLI
- Azure Resource Manager templates
- Azure Load Balancer health probes
- Azure Custom Script Extension for Linux
- Terraform AzureRM provider
- Bash
- Flask

## Sources Consulted
- Microsoft Learn: Azure CLI `az vmss` reference: https://learn.microsoft.com/en-us/cli/azure/vmss
- Microsoft Learn: Azure CLI `az vmss extension` reference: https://learn.microsoft.com/en-us/cli/azure/vmss/extension
- Microsoft Learn: Manage Virtual Machine Scale Sets with Azure CLI: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-manage-cli
- Microsoft Learn: ARM template reference for `Microsoft.Compute/virtualMachineScaleSets`: https://learn.microsoft.com/en-us/azure/templates/microsoft.compute/virtualmachinescalesets
- Microsoft Learn: ARM template reference for `Microsoft.Compute/virtualMachineScaleSets/extensions`: https://learn.microsoft.com/en-us/azure/templates/microsoft.compute/virtualmachinescalesets/extensions
- Microsoft Learn: Run Custom Script Extension on Linux VMs in Azure: https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-linux
- Microsoft Learn: Azure Load Balancer health probes: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Microsoft Learn: ARM template reference for `Microsoft.Network/loadBalancers`: https://learn.microsoft.com/en-us/azure/templates/microsoft.network/loadbalancers
- Microsoft Learn: Azure Virtual Network FAQ: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq
- Microsoft Learn: Azure Resource Manager deployment history: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-history
- Microsoft Learn: Azure CLI `az monitor activity-log` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log
- HashiCorp Terraform AzureRM `azurerm_linux_virtual_machine_scale_set` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine_scale_set

## Issues Found
- The subnet sizing note said a `/25` subnet has 126 usable IP addresses while also noting Azure reserves 5 IPs. A `/25` has 128 total addresses, so Azure leaves 123 usable addresses. Updated the comment to `123 usable IPs`.
- The VMSS health query referenced `instanceView.statuses` without expanding instance view data. Added `--expand instanceView` to the `az vmss list-instances` command.
- The Terraform snippet said `azurerm_linux_virtual_machine_scale_set` was using flexible orchestration. Current AzureRM documentation states that resource creates Uniform orchestration scale sets; Flexible scale sets use `azurerm_orchestrated_virtual_machine_scale_set`. Updated the comment to describe multiple placement groups for Uniform scale sets.
- The ARM timeout example used `provisioningTimeout` inside an extension properties object, which is not a valid VMSS extension property. Replaced it with `extensionsTimeBudget` on `extensionProfile`, the supported VMSS setting for extension startup time budget.

## Review Notes
The remaining commands and snippets are broadly consistent with current Azure CLI, ARM template, Custom Script Extension, Load Balancer, and Terraform AzureRM documentation. The Terraform quota-check example only calculates required cores locally; it does not by itself query Azure quota usage.
