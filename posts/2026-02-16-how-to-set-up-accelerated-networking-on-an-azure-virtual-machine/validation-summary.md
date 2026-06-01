# Validation Summary: How to Set Up Accelerated Networking on an Azure Virtual Machine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Machines
- Azure Accelerated Networking
- SR-IOV
- Azure CLI
- Linux networking tools (`lspci`, `ip`, `ethtool`)
- Windows PowerShell networking cmdlets
- `iperf3`
- `sockperf`

## Sources Consulted
- Microsoft Learn: Azure Accelerated Networking overview and benefits - https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-overview
- Microsoft Learn: Create an Azure Virtual Machine with Accelerated Networking - https://learn.microsoft.com/en-us/azure/virtual-network/create-virtual-machine-accelerated-networking
- Microsoft Learn: How Accelerated Networking works in Linux and FreeBSD VMs - https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-how-it-works
- Microsoft Learn: Manage accelerated networking for Azure Virtual Machines - https://learn.microsoft.com/en-us/azure/virtual-network/manage-accelerated-networking
- Microsoft Learn: Azure CLI `az vm` reference - https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: Azure CLI `az network nic` reference - https://learn.microsoft.com/en-us/cli/azure/network/nic
- Microsoft Learn: Dsv5 size series - https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dsv5-series
- Microsoft Learn: Bsv2-series sizes - https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/bsv2-series
- Microsoft Learn: Basv2-series sizes - https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/basv2-series
- Microsoft Learn: Microsoft Azure Network Adapter and DPDK on Linux - https://learn.microsoft.com/en-us/azure/virtual-network/setup-dpdk-mana

## Issues Found
- Replaced the deprecated `az vm list-sizes` example with `az vm list-skus`, because current Azure CLI documentation marks `az vm list-sizes` as deprecated and Microsoft documents `list-skus` for querying the `AcceleratedNetworkingEnabled` capability.
- Updated the B-series note. The original post said B-series VMs generally do not support accelerated networking, but current Bsv2 and Basv2 documentation lists Accelerated Networking as supported.
- Updated supported operating system guidance to align with the current Azure Accelerated Networking overview, which lists current Marketplace OS images rather than older broad version ranges.
- Replaced Mellanox-only wording with NVIDIA/Mellanox ConnectX or Microsoft Azure Network Adapter (MANA), because current Azure accelerated networking can use MANA as well as legacy mlx4/mlx5 devices.
- Adjusted Linux and Windows verification commands and text so they do not falsely require a Mellanox device on MANA-backed VMs.
- Softened fixed latency claims, because Microsoft documents lower latency, reduced jitter, and lower CPU utilization but does not guarantee the specific latency ranges in the original post.
- Clarified that applications should bind to the synthetic interface while most traffic flows through the VF data path, matching Microsoft guidance for dynamic VF revocation.

## Review Notes
The Azure CLI examples for creating a VM and updating a NIC use current flags. The D4s_v5 network bandwidth statement is consistent with the current Dsv5 size documentation, which lists 12,500 Mbps as the expected maximum aggregated network bandwidth, but Azure notes that upper limits are not guaranteed and actual performance depends on workload and network conditions.
