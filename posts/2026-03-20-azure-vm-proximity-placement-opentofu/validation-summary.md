# Validation Summary: How to Set Up Azure VM Proximity Placement Groups with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Resource Manager provider (`azurerm`)
- Azure Proximity Placement Groups
- Azure Virtual Machines
- Azure Availability Sets
- Azure Virtual Machine Scale Sets
- Azure CLI

## Sources Consulted
- Microsoft Learn: Proximity placement groups for Azure Virtual Machines — https://learn.microsoft.com/en-us/azure/virtual-machines/co-location
- Microsoft Learn: `az ppg` Azure CLI reference — https://learn.microsoft.com/en-us/cli/azure/ppg?view=azure-cli-latest
- Microsoft Learn: Availability sets overview — https://learn.microsoft.com/en-us/azure/virtual-machines/availability-set-overview
- Microsoft Learn: Azure Accelerated Networking overview — https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-overview
- Microsoft Learn: Virtual machine network bandwidth — https://learn.microsoft.com/en-us/azure/virtual-network/virtual-machine-network-throughput
- OpenTofu Docs: Resource Blocks — https://opentofu.org/docs/language/resources/syntax/
- Terraform Registry: `azurerm_proximity_placement_group` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/proximity_placement_group
- Terraform Registry: `azurerm_linux_virtual_machine` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- Terraform Registry: `azurerm_availability_set` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/availability_set
- Terraform Registry: `azurerm_linux_virtual_machine_scale_set` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine_scale_set
- Terraform Registry: `azurerm_network_interface` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_interface

## Issues Found
- The introduction incorrectly said a single PPG can span Availability Zones. I updated it to clarify that PPGs can be used with zonal deployments, but one PPG cannot span multiple zones.
- The Availability Set example associated the PPG with both the availability set and each VM. I removed `proximity_placement_group_id` from the VM example because Microsoft recommends attaching the PPG at the availability set or VM scale set resource level, not on each VM inside those constructs.
- The Availability Set comment implied a fixed fault-domain behavior inside PPGs. I reworded the comment to note that fault-domain limits vary by region.
- The conclusion described PPGs as pinning workloads to a physical cluster and advised starting with the largest VM first. I rewrote this to match Azure guidance: PPGs are a colocation constraint, deployments can fail due to allocation constraints, and retries should start with the VM size that failed or define the intended sizes up front.
- The conclusion incorrectly said Accelerated Networking guarantees bandwidth and used the wrong AzureRM argument name `enable_accelerated_networking`. I corrected this to the current provider argument `accelerated_networking_enabled` and updated the explanation to reflect that Accelerated Networking improves networking performance but does not guarantee bandwidth.
- The conclusion gave specific latency numbers without an authoritative basis. I replaced that with a vendor-aligned statement that PPGs reduce VM-to-VM latency for tightly coupled workloads.

## Review Notes
- The examples are technically valid as standalone snippets, but Microsoft recommends declaring intended VM sizes for mixed-size PPG deployments to reduce allocation failures. In AzureRM, this is exposed through `allowed_vm_sizes` on `azurerm_proximity_placement_group`, and `zone` can only be set when `allowed_vm_sizes` is also provided.
