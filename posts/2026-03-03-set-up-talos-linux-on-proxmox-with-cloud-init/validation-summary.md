# Validation Summary: How to Set Up Talos Linux on Proxmox with Cloud-Init

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Talos Linux
- Proxmox VE
- Proxmox cloud-init / NoCloud
- talosctl
- Kubernetes
- Terraform Proxmox provider
- Proxmox API
- PCI/GPU passthrough
- Proxmox snapshots and vzdump backups

## Sources Consulted
- Sidero Labs Talos NoCloud documentation: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/cloud-platforms/nocloud
- Sidero Labs Talos Proxmox documentation: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/virtualized-platforms/proxmox
- Sidero Labs Talos Boot Assets / Image Factory documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/boot-assets
- Sidero Labs Talos support matrix: https://docs.siderolabs.com/talos/v1.13/getting-started/support-matrix
- Talos Linux GitHub releases: https://github.com/siderolabs/talos/releases
- Proxmox VE Cloud-Init Support documentation: https://pve.proxmox.com/wiki/Cloud-Init_Support
- Proxmox VE qm manual: https://pve.proxmox.com/pve-docs/qm.1.html
- Proxmox VE PCI Passthrough documentation: https://pve.proxmox.com/wiki/PCI_Passthrough
- Proxmox VE vzdump manual: https://pve.proxmox.com/pve-docs-7/vzdump.1.html
- Terraform Registry Telmate Proxmox provider documentation: https://registry.terraform.io/providers/Telmate/proxmox/latest/docs/resources/vm_qemu
- Proxmox VE 9.0 release announcement: https://www.proxmox.com/en/news/press-releases/proxmox-virtual-environment-9-0

## Issues Found
- The post claimed cloud-init/NoCloud handled the initial Talos configuration, but the commands only added a cloud-init drive and then manually ran `talosctl apply-config`. Added the required Proxmox snippet placement, `qm set --cicustom user=...`, and `qm cloudinit update` steps, then removed the manual `apply-config` commands from the cloud-init workflow.
- The Talos download used the old GitHub v1.7.0 release asset. Updated the image download to a current Image Factory NoCloud raw image URL for Talos v1.13.0, verified with an HTTP 200 response.
- The prerequisites referenced Proxmox VE 7.x/8.x even though Proxmox VE 9.x is current and VE 7.x is outdated. Updated the prerequisite to Proxmox VE 8.x or 9.x.
- The QEMU guest agent command was unconditional, but Talos requires a Talos image built with the `siderolabs/qemu-guest-agent` extension for this to work. Changed the command to an optional commented command with that requirement.
- The GPU section said to use the Talos NVIDIA extension image. Updated this to say a Talos image built with the matching NVIDIA system extension, which matches the current Talos extension model.
- The snapshot section said rollback is instant. Adjusted the wording to warn that rollback must be coordinated with etcd and Kubernetes state in multi-node clusters.
- The conclusion overstated that cloud-init itself handles Talos configuration. Reworded it to accurately describe Proxmox cloud-init passing Talos machine configuration through NoCloud user-data.

## Review Notes
- The Terraform example is version-sensitive. It matches the older/common Telmate `proxmox_vm_qemu` shape, but Telmate 3.x documentation also describes a newer nested `disks` block model. Pinning the provider version would make that example more deterministic in a future revision.
- The guide assumes the `local` storage supports snippets at `/var/lib/vz/snippets`. This is the standard Proxmox path for `local`, but users with different storage IDs or cluster layouts need to adjust the `user=local:snippets/...` references.
