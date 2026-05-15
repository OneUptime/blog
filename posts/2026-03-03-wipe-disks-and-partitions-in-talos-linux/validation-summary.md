# Validation Summary: How to Wipe Disks and Partitions in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Talos disk and volume management
- Kubernetes DaemonSets and privileged pods
- etcd snapshots

## Sources Consulted
- Talos v1.12 Resetting a Machine: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/lifecycle-management/resetting-a-machine
- Talos v1.12 Disk Layout: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout
- Talos v1.12 Disk Management Overview: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/overview
- Talos v1.12 User Volumes: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/user
- Talos v1.12 Raw Volumes: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/raw
- Talos v1.12 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos v1.11 Boot Loader guide: https://docs.siderolabs.com/talos/v1.11/platform-specific-installations/bare-metal-platforms/bootloader

## Issues Found
- The disk layout described older GRUB-style partitions as the standard layout. Updated it to the current Talos layout of EFI, META, STATE, and EPHEMERAL, with a note that BIOS and BOOT can exist on GRUB-based, legacy BIOS, or upgraded installations.
- The reset behavior incorrectly said a full reset reboots into maintenance mode and leaves BOOT intact. Updated it to reflect current `talosctl reset` behavior: reset shuts down unless `--reboot` is set, and the default wipe mode is `all`, which can wipe the bootable installation.
- The reinstall section incorrectly implied reset preserves the boot partition. Updated it to clarify that a full reset should be paired with external boot media for reinstall workflows.
- The additional disk section used an outdated `machine.disks` example and said Talos does not provide direct disk access through `talosctl`. Replaced it with `UserVolumeConfig` guidance and the documented `talosctl wipe disk` command for unused block devices.
- The verification commands used undocumented or incorrect resource names (`systemstat`, `mounts`). Replaced them with documented `discoveredvolumes` and `mountstatus` resources.

## Review Notes
The post is technically relevant and now aligns with current Talos disk management and reset documentation. The privileged DaemonSet example remains valid as a last-resort Kubernetes approach, but `talosctl wipe disk` should be preferred when the device is not managed as an active Talos volume.
