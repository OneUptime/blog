# Validation Summary: How to Use talosctl mounts to View File System Mounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Talos block storage and volumes
- Linux filesystems and mounts
- Kubernetes local storage and volumes
- Bash scripting

## Sources Consulted
- Talos v1.13 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos v1.13 disk layout guide: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout
- Talos v1.13 disk management resources guide: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-management/resources
- Talos v1.13 user volumes guide: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-management/user
- Talos v1.13 UserVolumeConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/block/uservolumeconfig
- Talos v1.13 MachineConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config

## Issues Found
- The post described `talosctl mounts` as showing source, target, filesystem type, and mount options. Current `talosctl mounts` output is a disk-usage table with node, filesystem, size, used, available, percent used, and mounted-on columns. Updated the wording and example output.
- The example output omitted the `NODE` column and used column positions that made the Bash parsing snippets incorrect. Updated the sample output and adjusted both scripts to parse the current column positions.
- The monitoring script compared percentage values as integers while current output commonly includes decimal percentages. Updated the parsing to strip `%` and convert the value to an integer before comparison.
- The partition-layout section implied BIOS and BOOT partitions are always present. Current Talos documentation lists EFI, META, STATE, and EPHEMERAL as the default layout, with BIOS/BOOT relevant to legacy GRUB layouts. Updated the wording and changed the inspection command to `talosctl get discoveredvolumes`.
- The tmpfs section claimed Kubernetes configmap mounts are tmpfs. Kubernetes secret mounts are tmpfs-backed, but configmap mounts should not be generalized that way. Narrowed the statement to Kubernetes secret mounts and other runtime tmpfs entries.
- The Kubernetes volume section implied every persistent volume appears directly as an obvious mount. Updated the wording to cover filesystem-backed persistent volumes and local host paths more accurately.
- The mount troubleshooting section used `talosctl get machineconfig ... | grep disks`, which does not match the current user-volume workflow. Replaced it with `talosctl get volumestatus` and `talosctl get mountstatus`.
- The read-only mount troubleshooting example used `talosctl mounts` to inspect mount options, but that command does not show mount options. Replaced it with `talosctl read /proc/mounts`.
- The additional-mount configuration used the older `machine.disks` style. Updated it to the current `UserVolumeConfig` patch flow and the documented `/var/mnt/<name>` behavior.
- The storage inventory section used `talosctl disks`, which is not present in the current CLI reference. Updated it to `talosctl get disks`.

## Review Notes
The post is now accurate for current Talos documentation. Some operational thresholds, such as alerting at 80% disk usage, remain reasonable guidance rather than Talos-specific requirements.
