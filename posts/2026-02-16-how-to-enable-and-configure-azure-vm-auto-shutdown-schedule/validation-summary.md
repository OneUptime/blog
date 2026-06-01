# Validation Summary: How to Enable and Configure Azure VM Auto-Shutdown Schedule

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Machines
- Azure VM auto-shutdown
- Azure CLI
- Azure Automation
- Azure PowerShell Az module
- Azure Logic Apps
- Azure Policy
- Azure Resource Manager / Microsoft.DevTestLab schedules
- Azure Retail Prices API

## Sources Consulted
- Microsoft Learn: Auto-shutdown a virtual machine - https://learn.microsoft.com/en-us/azure/virtual-machines/auto-shutdown-vm
- Microsoft Learn: Azure CLI `az vm auto-shutdown` reference - https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest#az-vm-auto-shutdown
- Microsoft Learn: Azure CLI `az automation account create` reference - https://learn.microsoft.com/en-us/cli/azure/automation/account?view=azure-cli-latest
- Microsoft Learn: Azure Automation what's new - https://learn.microsoft.com/en-us/azure/automation/whats-new
- Microsoft Learn: Start/Stop VMs v2 overview - https://learn.microsoft.com/en-us/previous-versions/azure/functions/start-stop-vms/overview
- Microsoft Learn: Azure VM connector for Logic Apps - https://learn.microsoft.com/en-us/connectors/azurevm/
- Microsoft Learn: Microsoft.DevTestLab/schedules ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.devtestlab/schedules
- Microsoft Learn: DevTest Labs virtual machine schedules REST API - https://learn.microsoft.com/en-us/rest/api/dtl/virtual-machine-schedules/create-or-update?view=rest-dtl-2018-09-15
- Microsoft Learn: Azure VM states and billing status - https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing
- Microsoft Learn: Azure Retail Prices API - https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices
- Azure Retail Prices API query for `Standard_D4s_v5` in `eastus`

## Issues Found
- The Azure CLI examples used a `--timezone` option for `az vm auto-shutdown`, but the current Azure CLI command does not support that option. Removed `--timezone` from CLI examples and clarified that the CLI `--time` value is UTC in HHMM format.
- The post listed common timezone values directly under the CLI section, implying they could be passed to `az vm auto-shutdown`. Replaced that list with guidance to use ARM/Azure Policy schedule resources when a timezone-aware schedule is required from automation.
- The post referred to the older Azure Automation "Start/Stop VMs during off-hours" solution as a popular current choice. Updated the text to point to Microsoft's current packaged "Start/Stop VMs v2" replacement and kept the custom Azure Automation runbook example.
- The Azure Policy `existenceCondition` checked only for any enabled `Microsoft.DevTestLab/schedules` resource. Added a `targetResourceId` check so the policy validates that the enabled schedule applies to the VM being evaluated.
- The cost table for 10 `Standard_D4s_v5` VMs was off by roughly a factor of ten for East US Linux pay-as-you-go compute pricing. Updated the monthly estimates from about `$1,400/VM`, `$420/VM`, and `$340/VM` to about `$140/VM`, `$42/VM`, and `$34/VM`, and corrected the total monthly savings from nearly `$10,000` to roughly `$1,000`.

## Review Notes
The custom Azure Automation runbook is directionally correct but assumes the Automation Account managed identity has been granted sufficient permissions, such as Virtual Machine Contributor or an equivalent custom role, on the target VMs or resource group. The Azure CLI `automation account` command group is currently delivered by an Azure CLI extension and marked experimental in the Microsoft reference.
