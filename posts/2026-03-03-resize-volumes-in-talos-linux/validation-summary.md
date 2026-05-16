# Validation Summary: How to Resize Volumes in Talos Linux

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Talos Linux (immutable Kubernetes OS)
- talosctl CLI
- Kubernetes PersistentVolumes (PV) / PersistentVolumeClaims (PVC)
- Kubernetes StorageClass and CSI drivers (AWS EBS CSI, Azure Disk CSI)
- Rook-Ceph
- Longhorn, OpenEBS (mentioned)
- VMware/vSphere (govc)
- Proxmox (qm)
- AWS EC2 / EBS
- LVM (mentioned, comparison)
- Kubernetes kubelet image garbage collection

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Talos Linux storage docs: https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/storage/
- Talos disk management: https://www.talos.dev/v1.10/talos-guides/configuration/disk-management/
- Talos upgrade docs: https://docs.siderolabs.com/talos/v1.6/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Kubernetes StorageClass / volume expansion docs: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Rook-Ceph CephCluster CRD: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- govc reference: https://github.com/vmware/govmomi/tree/main/govc
- Proxmox qm(1) man page
- AWS CLI `aws ec2 modify-volume` reference

## Issues Found
1. **Incorrect description of the `talosctl upgrade --preserve` flag.** The original text claimed the flag "keeps the existing machine configuration intact during the upgrade." This conflates two things: the machine configuration is stored in the STATE partition and is preserved by default during any upgrade, while `--preserve` actually preserves the contents of the EPHEMERAL partition (container images, pod data, etc.). I rewrote the explanation to accurately describe what `--preserve` does and to clarify that EPHEMERAL growth happens after the post-upgrade reboot when Talos detects the larger disk.

2. **Invalid `talosctl get images` command.** `talosctl get` queries COSI resources, and there is no `images` resource. The correct command for listing CRI images on a Talos node is `talosctl image list`. Updated the command accordingly.

3. **Misleading StorageClass example for volume expansion.** The original example showed a StorageClass with `provisioner: kubernetes.io/no-provisioner` (used for statically provisioned local PVs) together with `allowVolumeExpansion: true`. The no-provisioner cannot expand volumes, so this example would not actually enable expansion. Updated the example to use a CSI driver (`ebs.csi.aws.com`) that genuinely supports volume expansion, while still illustrating the `allowVolumeExpansion` field that was the point of the snippet.

## Review Notes
- The Talos system partition list ("EFI/BIOS, BOOT, META, STATE, and EPHEMERAL") is a reasonable summary. On modern Talos installs there are separate EFI and BIOS partitions plus an optional BOOT partition depending on boot method, but the simplified phrasing is acceptable for an introductory section.
- The `machine.disks` configuration example uses the legacy v1alpha1 disk format. Talos 1.7+ has introduced a richer Volume configuration document (`VolumeConfig`) for user volumes. The legacy `machine.disks` block is still supported and works as shown, but readers running newer Talos versions may want to investigate the newer volume management APIs for greater flexibility.
- The post correctly notes that growing partitions is generally safe while shrinking can lose data, and that resizing additional disk partitions through machine config changes may require a reboot.
- `talosctl get mounts` is used in the post; both `talosctl get mounts` (via COSI MountStatus resource short name) and the separate `talosctl mounts` subcommand are valid for inspecting mounted filesystems on a node, so no change was made.
- The `kubectl patch pvc` command syntax, the `kubelet` `imageGCHighThresholdPercent`/`imageGCLowThresholdPercent` options under `machine.kubelet.extraConfig`, the `govc vm.disk.change`, `qm resize`, and `aws ec2 modify-volume` commands were all verified as accurate.
