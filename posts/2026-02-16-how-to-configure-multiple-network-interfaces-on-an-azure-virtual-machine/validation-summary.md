# Validation Summary: How to Configure Multiple Network Interfaces on an Azure Virtual Machine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Machines
- Azure Virtual Network
- Azure network interfaces
- Azure CLI
- Linux policy-based routing
- Netplan
- Windows NetTCPIP PowerShell cmdlets
- Azure Network Watcher flow logs

## Sources Consulted
- Microsoft Learn: Create a Linux VM in Azure with multiple NICs: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/multiple-nics
- Microsoft Learn: Create and manage Windows VMs in Azure that use multiple NICs: https://learn.microsoft.com/en-us/azure/virtual-machines/windows/multiple-nics
- Microsoft Learn: Assign multiple IP addresses to VMs using Azure CLI: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-multiple-ip-addresses-cli
- Microsoft Learn: az vm CLI reference: https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: az network vnet CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/vnet
- Microsoft Learn: az network vnet subnet CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Microsoft Learn: az network nic CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/nic
- Microsoft Learn: Dsv5-series VM sizes: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dsv5-series
- Microsoft Learn: Fsv2-series VM sizes: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/compute-optimized/fsv2-series
- Netplan documentation: YAML configuration and routing policy: https://canonical-netplan.readthedocs-hosted.com/en/stable/netplan-yaml/
- Microsoft Learn: New-NetRoute PowerShell cmdlet: https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netroute
- Microsoft Learn: Set-NetIPInterface PowerShell cmdlet: https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipinterface
- Microsoft Learn: NSG flow logs overview and retirement notice: https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-nsg-flow-logging-overview

## Issues Found
- The VM creation example attached three NICs to `Standard_D4s_v5`, but Microsoft documents that size as supporting only two NICs. Changed the example size to `Standard_D8s_v5`, which supports four NICs.
- The VM size lookup example used deprecated `az vm list-sizes`. Replaced it with `az vm list-skus` and a query for the `MaxNetworkInterfaces`, `MemoryGB`, and `vCPUs` capabilities.
- The VNet and subnet examples used older singular Azure CLI options (`--address-prefix`, `--subnet-prefix`, and `--address-prefix`). Updated them to current documented options (`--address-prefixes`, `--subnet-prefixes`, and `--address-prefixes`).
- The Netplan example routed directly connected subnet prefixes via the Azure gateway. Changed those connected subnet routes to omit `via`, matching the direct connected-route form used in the preceding `ip route` examples.
- The Windows section said each NIC gets its own gateway. Microsoft documents that Azure assigns the default gateway only to the primary NIC. Updated the text and added a `New-NetRoute` example for secondary-NIC traffic.
- The monitoring section recommended NSG flow logs without mentioning their current retirement path. Updated it to recommend virtual network flow logs and note that new NSG flow logs can no longer be created.

## Review Notes
Azure CLI was not installed in the local environment, so CLI syntax was verified against current Microsoft Learn command reference pages rather than local `az --help` output. The NIC examples still assume that the referenced resource group and NSGs already exist.
