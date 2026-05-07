# Validation Summary: How to Configure Azure VM Network Interfaces with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Resource Manager (`azurerm`) provider
- Azure Virtual Machines
- Azure Network Interfaces (NICs)
- Azure Network Security Groups (NSGs)
- Azure CLI

## Sources Consulted
- Terraform Registry: `azurerm_network_interface` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_interface
- Terraform Registry: `azurerm_linux_virtual_machine` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- Microsoft Learn: AzureRM provider version history (`azurerm_network_interface` deprecation notes): https://learn.microsoft.com/en-us/azure/developer/terraform/provider-version-history-azurerm-3-0-0-to-3-116-0
- Microsoft Learn: How Accelerated Networking works in Linux and FreeBSD VMs: https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-how-it-works
- Microsoft Learn: Create an Azure Virtual Machine with Accelerated Networking: https://learn.microsoft.com/en-us/azure/virtual-network/create-virtual-machine-accelerated-networking
- Microsoft Learn: Create, Change, or Delete Azure Network Interfaces: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-network-interface
- Microsoft Learn: Add network interfaces to or remove from Azure VMs: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-network-interface-vm
- Microsoft Learn: Configure IP addresses for an Azure network interface: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-network-interface-addresses
- Microsoft Learn: Configure multiple network interfaces in Azure Linux virtual machines: https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/linux-vm-multiple-virtual-network-interfaces-configuration
- Microsoft Learn: Azure CLI `az network nic` commands: https://learn.microsoft.com/en-us/cli/azure/network/nic
- Microsoft Learn: Azure CLI `az vm` commands: https://learn.microsoft.com/en-us/cli/azure/vm

## Issues Found
- The post used deprecated `azurerm_network_interface` arguments: `enable_accelerated_networking` and `enable_ip_forwarding`. I replaced them with the current `accelerated_networking_enabled` and `ip_forwarding_enabled` arguments so the examples align with current AzureRM provider documentation.
- The application NIC example marked its only IP configuration as `primary = false`. I changed it to `primary = true` because each NIC must have a primary IP configuration, and a single-IP-config NIC cannot have only a secondary configuration.
- The introduction and conclusion included overly specific accelerated networking performance claims (`~25 microseconds`, `60-70%`) and an over-broad VM-series rule of thumb. I replaced those statements with Microsoft-documented behavior: Accelerated Networking uses SR-IOV, most packets bypass the host virtual switch, and support depends on the VM size and guest OS.

## Review Notes
- `az network nic list-effective-nsg` and `az network nic show-effective-route-table` are valid current Azure CLI commands, but they apply to NICs attached to running VMs.
- The statement that the first NIC in `network_interface_ids` becomes the primary NIC is correct for current `azurerm_linux_virtual_machine` behavior.
- Accelerated Networking support changes across VM families and guest OS images over time, so future updates to this post should continue to point readers to the current Microsoft support matrix rather than hard-coding family-wide assumptions.
