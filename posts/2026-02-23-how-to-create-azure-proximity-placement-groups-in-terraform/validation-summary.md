# Validation Summary: How to Create Azure Proximity Placement Groups in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Proximity Placement Groups
- Azure Linux Virtual Machines
- Azure Availability Sets
- Azure Virtual Machine Scale Sets
- Azure Accelerated Networking

## Sources Consulted
- Microsoft Learn: Proximity placement groups - https://learn.microsoft.com/en-us/azure/virtual-machines/co-location
- Microsoft Learn: Create a proximity placement group using the Azure portal - https://learn.microsoft.com/en-us/azure/virtual-machines/windows/proximity-placement-groups-portal
- Microsoft Learn: Azure Accelerated Networking overview - https://learn.microsoft.com/en-nz/azure/virtual-network/accelerated-networking-overview
- HashiCorp Terraform Provider AzureRM v3.80.0: azurerm_proximity_placement_group - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/proximity_placement_group.html.markdown
- HashiCorp Terraform Provider AzureRM v3.80.0: azurerm_linux_virtual_machine - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/linux_virtual_machine.html.markdown
- HashiCorp Terraform Provider AzureRM v3.80.0: azurerm_linux_virtual_machine_scale_set - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/linux_virtual_machine_scale_set.html.markdown
- HashiCorp Terraform Provider AzureRM v3.80.0: azurerm_availability_set - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/availability_set.html.markdown

## Issues Found
- The post described `allowed_vm_sizes` as a hard restriction that prevents other VM sizes from being added to the PPG. Azure documents this as VM size intent: it helps Azure select a data center that supports the specified sizes, but it does not reserve capacity and Azure can still allow VM sizes outside the intent. Updated the wording and code comment to describe intent accurately.
- The deployment strategy said deployment order always matters and recommended deploying the largest VM first. Azure documents that with intent, VMs do not have to be deployed in a particular order. Updated the guidance to recommend `allowed_vm_sizes` first and largest/most constrained VM first only when not using intent.
- The standalone VM example enabled accelerated networking and the surrounding text implied that this was sufficient with a standalone PPG. Microsoft documents that accelerated networking with a PPG works when VMs are deployed in an availability set or virtual machine scale set linked to the PPG. Removed the standalone NIC setting and updated the explanatory paragraph.
- The post stated that Azure may place PPG resources in the same network spine or rack. Microsoft documents PPGs as co-locating resources close together in the same data center, without guaranteeing a rack or spine. Updated that claim to avoid an unsupported guarantee.
- The availability-set section stated that fault domains would be within the same physical cluster. Microsoft documents fault-domain distribution with PPG colocation, but not that specific physical-cluster guarantee. Updated the wording to stay within documented behavior.

## Review Notes
- The Terraform resources and arguments used in the examples are valid for AzureRM provider `~> 3.80`, including `azurerm_proximity_placement_group.allowed_vm_sizes`, `azurerm_linux_virtual_machine.proximity_placement_group_id`, `azurerm_availability_set.proximity_placement_group_id`, and `azurerm_linux_virtual_machine_scale_set.proximity_placement_group_id`.
- The snippets reference surrounding infrastructure such as `azurerm_subnet.hpc` and `azurerm_network_interface.db` that is not shown in the post. This is acceptable for focused snippets, but a future full example should include those resources or explicitly label the snippets as partial.
