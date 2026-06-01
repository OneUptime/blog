# Validation Summary: How to Redeploy an Azure Virtual Machine to a New Host Node

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Microsoft Azure Virtual Machines
- Azure VM redeployment and reapply operations
- Azure CLI
- Azure PowerShell
- Azure Compute REST API
- Linux systemd
- Azure temporary disks, public IPs, availability sets, and availability zones

## Sources Consulted
- Microsoft Learn: Redeploy Windows virtual machine to new Azure node - https://learn.microsoft.com/en-in/troubleshoot/azure/virtual-machines/windows/redeploy-to-new-node-windows
- Microsoft Learn: az vm redeploy Azure CLI reference - https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest#az-vm-redeploy
- Microsoft Learn: Set-AzVM Azure PowerShell reference - https://learn.microsoft.com/en-us/powershell/module/az.compute/set-azvm
- Microsoft Learn: Virtual Machines - Redeploy REST API - https://learn.microsoft.com/en-us/rest/api/compute/virtual-machines/redeploy
- Microsoft Learn: Virtual Machines - Instance View REST API - https://learn.microsoft.com/en-us/rest/api/compute/virtual-machines/instance-view
- Microsoft Learn: Configure IP addresses for an Azure network interface - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-network-interface-addresses
- Microsoft Learn: Azure Virtual Network FAQ - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq

## Issues Found
- The post described redeployment as a "clean shutdown." Microsoft documents the operation as shutting down the VM, moving it to a new node, and powering it back on, without guaranteeing a guest-clean shutdown. Removed the unsupported "clean shutdown" wording.
- The post said redeployment moves the VM within the same Azure datacenter. Microsoft documentation uses "within the Azure infrastructure" and Azure placement is normally reasoned about by region, availability set, and availability zone rather than a named datacenter. Updated the wording to match the documented behavior.
- The Linux temporary disk location was identified as `/dev/sdb`, which is not a stable user-facing mount path across Linux images and configurations. Changed it to the commonly documented/used mount path `/mnt/resource`.
- The pre/post-check CLI examples labeled `instanceView.platformFaultDomain` as `Host`, but Azure exposes a fault domain value, not a physical host identifier. Renamed the output column to `FaultDomain`.
- The section titled "Redeploying with ARM Templates" showed an `az rest` call, not an ARM template. Renamed the section to "Redeploying with the REST API."
- The REST API example used API version `2023-07-01`. Updated it to the current documented Compute redeploy API version `2025-11-01`.

## Review Notes
The Azure CLI and PowerShell redeploy commands are valid. The REST redeploy endpoint is valid. The post correctly notes that redeployment causes VM downtime, loses temporary/ephemeral disk data, preserves associated resources, and can update dynamic IP addresses associated with the VM network interface.
