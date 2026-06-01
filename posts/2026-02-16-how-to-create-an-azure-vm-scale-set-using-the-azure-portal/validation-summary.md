# Validation Summary: How to Create an Azure VM Scale Set Using the Azure Portal

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Machine Scale Sets
- Azure Portal
- Azure Load Balancer
- Azure Application Gateway
- Azure Monitor and autoscale
- Azure CLI
- cloud-init
- Azure Update Manager

## Sources Consulted
- Microsoft Learn: Azure Virtual Machine Scale Sets overview - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/overview
- Microsoft Learn: Orchestration modes for Virtual Machine Scale Sets in Azure - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-orchestration-modes
- Microsoft Learn: Modify an Azure Virtual Machine Scale Set - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-upgrade-scale-set
- Microsoft Learn: Set the upgrade policy mode on Virtual Machine Scale Sets - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-set-upgrade-policy
- Microsoft Learn: Overview of autoscale with Azure Virtual Machine Scale Sets - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-autoscale-overview
- Microsoft Learn: Automatic instance repairs with Azure Virtual Machine Scale Sets - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-automatic-instance-repairs
- Microsoft Learn: az vmss diagnostics - https://learn.microsoft.com/en-us/cli/azure/vmss/diagnostics
- Microsoft Learn: az vmss list-instances - https://learn.microsoft.com/en-us/cli/azure/vmss
- Microsoft Learn: Monitor virtual machines in Azure - https://learn.microsoft.com/en-us/azure/azure-monitor/vm/monitor-vm
- Microsoft Learn: Azure Update Manager overview - https://learn.microsoft.com/en-us/azure/update-manager/
- Microsoft Learn Q&A: Azure Automation Update Management retirement notice - https://learn.microsoft.com/en-us/answers/questions/1459053/retirement-announcement-azure-automation-update-ma

## Issues Found
- The post said the scale set name becomes part of each instance's hostname. Microsoft documents VM naming conventions by orchestration mode, so I changed this to "VM name" to avoid implying the guest OS hostname always follows that wording.
- The post recommended Uniform mode for most use cases. Microsoft documentation now recommends Flexible orchestration for new VM Scale Set workloads, so I adjusted the guidance while keeping Uniform as a straightforward choice for this identical-instance walkthrough.
- The post said changing VM size later requires reimaging all instances. Microsoft documentation states model changes must be applied to existing instances, and some SKU changes require deallocation, not necessarily reimaging. I corrected that statement.
- The OS image upgrade note did not distinguish orchestration modes. Microsoft documentation states image-based automatic OS upgrades are not supported in Flexible mode, so I added that caveat.
- The Azure CLI verification command uses `az vmss list-instances`, whose current docs note that Flexible orchestration should use `az vm list` for full details. I clarified the command comment as Uniform orchestration mode.
- The post referred to Azure Update Management for OS patching. Azure Automation Update Management retired on August 31, 2024, so I changed the recommendation to Azure Update Manager.

## Review Notes
Azure CLI was not installed in the local environment, so CLI syntax was verified against the official Microsoft Learn Azure CLI reference instead of local `az --help` output. The remaining portal guidance, autoscale concepts, health monitoring behavior, diagnostics command shape, and cloud-init snippet were technically consistent with the consulted documentation.
