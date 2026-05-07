# Validation Summary: How to Configure IPv6 on Azure Network Interface Cards

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Virtual Network
- Azure Network Interface Cards (NICs)
- Azure Virtual Machines
- Azure CLI
- Terraform
- AzureRM Terraform provider
- IPv6 / dual-stack networking
- cloud-init / netplan

## Sources Consulted
- Microsoft Learn: Add a dual-stack network to an existing virtual machine — https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/add-dual-stack-ipv6-vm-portal
- Microsoft Learn: Create an Azure virtual machine with a dual-stack network — https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/create-vm-dual-stack-ipv6-portal
- Microsoft Learn: Configure IP addresses for an Azure network interface — https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-network-interface-addresses
- Microsoft Learn: What is IPv6 for Azure Virtual Network? — https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Microsoft Learn: Configure DHCPv6 for Linux VMs — https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-ipv6-for-linux
- Microsoft Learn: az network nic ip-config — https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config?view=azure-cli-latest
- Microsoft Learn: az network nic ip-config address-pool — https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config/address-pool?view=azure-cli-latest
- Microsoft Learn: Public IP addresses in Azure — https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses
- Terraform Registry: azurerm_network_interface — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_interface
- Terraform Registry: azurerm_public_ip — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip
- Terraform Registry: azurerm_linux_virtual_machine — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- HashiCorp Developer: file function — https://developer.hashicorp.com/terraform/language/functions/file
- HashiCorp Developer: pathexpand function — https://developer.hashicorp.com/terraform/language/functions/pathexpand
- cloud-init docs: Base configuration / cloud.cfg.d overrides — https://cloudinit.readthedocs.io/en/latest/reference/base_config_reference.html

## Issues Found
- The introduction overstated IPv6 flexibility on Azure NICs. I updated it to reflect that Azure VMs must keep a primary IPv4 configuration and that a NIC can have at most one private IPv6 address on a secondary IP configuration.
- The Terraform example used `file("~/.ssh/id_rsa.pub")`. I changed it to `file(pathexpand("~/.ssh/id_rsa.pub"))` because HashiCorp documents `pathexpand` as the function that expands `~`.
- The guest OS section said Ubuntu/Debian handle IPv6 automatically via DHCP and pointed readers to edit `/etc/netplan/50-cloud-init.yaml`. I corrected this to match Azure's DHCPv6 guidance: supported Debian images are preconfigured, while Ubuntu images may require enabling DHCPv6 and adding a cloud-init override.
- The cloud-init override path in Azure's Ubuntu DHCPv6 guidance is inconsistent with standard cloud-init directory naming. I used `/etc/cloud/cloud.cfg.d/91-azure-network.cfg`, which matches cloud-init's documented override directory.
- The example `ping6 fd00:db8::1  # VNet gateway` was misleading because it does not represent a generic Azure VNet gateway test target. I removed it and kept verification with `ip -6 addr show` and `curl -6 https://ipv6.icanhazip.com`.
- The load balancer backend pool example used a generic `az network nic ip-config update` flow. I replaced it with the documented `az network nic ip-config address-pool add` command, which directly matches the operation being described.

## Review Notes
- Microsoft Learn currently contains some overlapping and partially inconsistent IPv6 NIC guidance between the general NIC IP-address article and the newer dual-stack VM walkthroughs. The post was aligned to the newer, more specific dual-stack VM documentation.
- The post assumes the virtual network and subnet already have IPv6 address space configured. That prerequisite is now described more precisely, but the post still does not walk through VNet/subnet creation end to end.
