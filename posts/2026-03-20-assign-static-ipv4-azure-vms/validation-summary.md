# Validation Summary: How to Assign Static IPv4 Addresses to Azure VMs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Microsoft Azure Virtual Machines
- Azure Virtual Network NIC IP configurations
- Azure CLI
- Ubuntu Linux networking

## Sources Consulted
- Microsoft Learn: Azure CLI reference for `az network nic create` https://learn.microsoft.com/en-us/cli/azure/network/nic?view=azure-cli-latest
- Microsoft Learn: Azure CLI reference for `az network nic ip-config` https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config?view=azure-cli-latest
- Microsoft Learn: Azure CLI reference for `az network public-ip create` https://learn.microsoft.com/en-us/cli/azure/network/public-ip?view=azure-cli-lts
- Microsoft Learn: Configure IP addresses for an Azure network interface https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-network-interface-addresses
- Microsoft Learn: Create a VM with a static private IP address using the Azure portal, Azure PowerShell, or Azure CLI https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-networks-static-private-ip
- Microsoft Learn: Assign multiple IP addresses to virtual machines using the Azure CLI https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-multiple-ip-addresses-cli
- Microsoft Learn: Azure Virtual Network FAQ https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq

## Issues Found
- The introduction said a dynamic private IP on an Azure VM can change when the VM is deallocated and started again. Current Microsoft documentation for Azure Resource Manager networking says private IPs remain assigned unless the NIC is deleted, moved to a different subnet, or the allocation method is changed. I updated the introduction to reflect the current behavior and clarified why static private IPs are still useful.
- The public IP example hardcoded `--location eastus` in an otherwise generic walkthrough. That can create a region mismatch with the VM NIC or virtual network, so I removed the hardcoded location.
- The Ubuntu secondary IP example used `ip addr add` as though it were a persistent configuration step. That command is temporary and is lost on reboot, so I updated the text and command comment to say it is only for a quick temporary test.
- The dynamic-revert example used generic property mutation flags instead of the documented Azure CLI option for this operation. I replaced it with `--private-ip-address ""`, which the Azure CLI reference documents as the way to return the IP configuration to dynamic allocation.

## Review Notes
- Persistent guest OS configuration for secondary private IPs is distro-specific. On Ubuntu 18.04 and later, Microsoft Learn typically uses `netplan` for permanent configuration.
- The examples assume the virtual network and subnet already exist and that `$RESOURCE_GROUP` is already set before running the later commands.
