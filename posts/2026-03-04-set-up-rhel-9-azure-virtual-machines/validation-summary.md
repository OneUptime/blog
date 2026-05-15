# Validation Summary: How to Set Up RHEL on Azure Virtual Machines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Azure Virtual Machines
- Azure CLI
- Azure Managed Disks
- Azure Managed Identity
- Azure Key Vault
- Azure Network Security Groups
- firewalld
- Azure Monitor Agent
- Azure Monitor data collection rules
- Azure Accelerated Networking

## Sources Consulted
- Microsoft Learn: Overview of Red Hat Enterprise Linux images in Azure - https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-images
- Microsoft Learn: Install the Azure CLI on Linux - https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux
- Microsoft Learn: az vm reference - https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: az vm disk reference - https://learn.microsoft.com/en-us/cli/azure/vm/disk
- Microsoft Learn: Add a disk to a Linux VM - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/add-disk
- Microsoft Learn: Format and mount managed disks to Azure Linux VMs - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/disks-format-mount-data-disks-linux
- Microsoft Learn: Enable VM monitoring in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/vm/vm-enable-monitoring
- Microsoft Learn: az monitor data-collection rule reference - https://learn.microsoft.com/en-us/cli/azure/monitor/data-collection/rule
- Microsoft Learn: az monitor data-collection rule association reference - https://learn.microsoft.com/en-us/cli/azure/monitor/data-collection/rule/association
- Microsoft Learn: Manage accelerated networking for Azure Virtual Machines - https://learn.microsoft.com/en-us/azure/virtual-network/manage-accelerated-networking
- Microsoft Learn: Accelerated Networking overview and benefits - https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-overview

## Issues Found
- The VM image URN used `RedHat:RHEL:9_3:latest`, which does not match Microsoft's documented standard RHEL 9 image SKU. Changed it to `RedHat:RHEL:9-lvm-gen2:latest`.
- The Azure CLI installation command on RHEL 9 assumed `azure-cli` was already available in enabled repositories. Added the Microsoft package signing key and RHEL 9 Microsoft package repository setup before installing `azure-cli`.
- The disk mounting example wrote `/dev/sdc1` directly to `/etc/fstab`. Microsoft recommends using UUIDs because Linux device names can change across reboots. Added disk identification, `partprobe`, UUID lookup, and `nofail` in `/etc/fstab`.
- The Azure Monitor data collection rule command used `--log-analytics-workspace-id`, which is not a current `az monitor data-collection rule create` parameter. Replaced it with the supported `--log-analytics`, `--performance-counters`, `--syslog`, and `--data-flows` arguments.
- The Azure Monitor Agent section created a DCR but did not associate it with the VM. Added `az monitor data-collection rule association create` so the agent has an applied collection configuration.
- The accelerated networking check only returned the NIC resource ID, not the accelerated networking state. Updated it to query the NIC's `enableAcceleratedNetworking` property and reused the NIC ID when enabling the feature.

## Review Notes
- The Key Vault command uses access policies. This is valid only for vaults using the vault access policy permission model; vaults configured for Azure RBAC should use role assignments instead.
- The default `--nsg-rule SSH` example opens SSH for initial access. For production environments, restrict SSH to trusted source addresses or use a private access pattern such as Azure Bastion.
