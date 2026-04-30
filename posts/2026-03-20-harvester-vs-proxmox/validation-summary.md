# Validation Summary: Harvester vs Proxmox: HCI Platform Comparison

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- SUSE Harvester
- Proxmox VE
- Kubernetes
- RKE2
- KubeVirt
- Longhorn
- Rancher
- KVM/QEMU
- LXC
- Corosync
- Proxmox HA Manager

## Sources Consulted
- Harvester Rancher integration docs: https://docs.harvesterhci.io/v1.7/rancher/rancher-integration/
- Harvester virtualization management docs: https://docs.harvesterhci.io/v1.7/rancher/virtualization-management
- Harvester virtual machines docs: https://docs.harvesterhci.io/v1.7/vm/virtual-machines/
- KubeVirt user guide, VirtualMachineInstance API overview: https://kubevirt.io/user-guide/user_workloads/virtual_machine_instances/
- KubeVirt user guide, memory examples using `spec.template.spec.domain.memory.guest`: https://kubevirt.io/user-guide/compute/memory_hotplug/
- Proxmox VE Administration Guide: https://pve.proxmox.com/pve-docs/pve-admin-guide.html
- Proxmox VE HA Manager documentation: https://pve.proxmox.com/pve-docs/ha-manager.1.html
- Proxmox VE API documentation: https://pve.proxmox.com/mediawiki/index.php?title=Proxmox_VE_API
- Proxmox VE storage documentation: https://pve.proxmox.com/pve-docs/chapter-pvesm.html
- Proxmox VE introduction/licensing overview: https://pve.proxmox.com/wiki/Introduction
- Harvester GitHub repository for license/release context: https://github.com/harvester/harvester
- Harvester release history: https://github.com/harvester/harvester/wiki/Release-History

## Issues Found
- Harvester was described as directly providing container workloads in the same way it provides VM management and storage. I changed this to reflect current Harvester documentation: Rancher integration and Kubernetes cluster provisioning are standard, while running general container workloads directly on the Harvester cluster is documented as experimental.
- The feature table listed Proxmox high availability as `Corosync/Pacemaker`. I corrected this to `Corosync + Proxmox HA Manager`, which matches current Proxmox documentation.
- The Proxmox license row implied the software license changes with a paid subscription. I corrected this to `AGPLv3; optional enterprise subscription`, because the software remains AGPLv3 and subscriptions cover enterprise repository access and support.
- The Proxmox architecture diagram implied `Ceph / ZFS / LVM` are shared storage in general. I corrected the shared-storage wording so it no longer suggests local ZFS/LVM deployments are inherently shared across cluster nodes.
- The Harvester recommendation and conclusion text overstated “VM and container management” on the platform itself. I aligned both with the verified Rancher/Kubernetes management model.

## Review Notes
- The Harvester VM YAML snippet is syntactically plausible for a KubeVirt `VirtualMachine` resource and uses current `kubevirt.io/v1` API conventions, but it is still an illustrative fragment and assumes a corresponding `DataVolume` exists.
- The Proxmox API `curl` example uses the correct API base path and token-auth pattern from the official API docs, but real-world VM provisioning commonly adds disk, storage, and network parameters beyond the minimal example shown.
- Harvester direct bare-metal container workload support is still explicitly labeled experimental in the current Harvester Rancher integration docs as of April 29, 2026.
