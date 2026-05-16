# Validation Summary: How to Understand Talos Linux Ephemeral Storage Model

## Status
validated

## Post Type
Guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- containerd
- etcd
- LUKS2 disk encryption
- Prometheus node filesystem metrics

## Sources Consulted
- Talos Linux Disk Layout: https://www.talos.dev/v1.12/talos-guides/configuration/disk-management/layout/
- Talos Linux Disk Management and volume configuration: https://www.talos.dev/v1.10/talos-guides/configuration/disk-management/
- Talos Linux Disk Encryption: https://www.talos.dev/latest/talos-guides/configuration/disk-encryption/
- Talos Linux CLI reference: https://www.talos.dev/latest/reference/cli/
- Talos Linux Resetting a Machine: https://www.talos.dev/v1.9/talos-guides/resetting-a-machine/
- Talos Linux Upgrading Talos Linux: https://www.talos.dev/latest/talos-guides/upgrading-talos/
- Kubernetes kubelet reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/

## Issues Found
- The post used `talosctl get blockdevices`, but current Talos documentation uses resources such as `discoveredvolumes`, `disks`, `volumestatus`, and `mountstatus`. Changed the command to `talosctl get discoveredvolumes`.
- The mount example used `talosctl mounts | grep ephemeral`, which is less accurate for current Talos volume resources. Changed it to `talosctl get mountstatus EPHEMERAL`.
- The disk layout table listed `EFI/BIOS` as `~100MB` and a separate `BOOT` partition as part of the simplified layout. Current Talos disk layout documentation describes the default layout as `EFI`, `META`, `STATE`, and `EPHEMERAL`, with `EFI` around 1GB in the simplified diagram. Updated the table accordingly.
- The reset-survival table implied non-EPHEMERAL partitions survive a default reset. Talos reset erases all partitions when no specific system labels are supplied, so the table now describes default reset behavior as destructive for all listed system partitions.
- The STATE partition was described as always encrypted. Talos encryption is configurable and disabled by default, so the table now says it is optionally encrypted.
- The disk-layout customization snippet used only `machine.install.disk`, which selects the install disk but does not customize the EPHEMERAL volume layout. Replaced it with a current `VolumeConfig` example for `EPHEMERAL`.
- The disk encryption snippet used `machine.systemDiskEncryption`, which current Talos docs mark as replaced by `VolumeConfig` documents for system volumes. Replaced it with `VolumeConfig` examples for `EPHEMERAL` and `STATE`.
- The encryption explanation conflated `nodeID` and TPM-based keys. Updated it to state that `nodeID` is generated from the node UUID and partition label, and that TPM is a separate supported key kind.
- The encryption migration command suggested an upgrade/reinstall. Current Talos docs recommend staging the config and wiping the target partition for an existing unencrypted EPHEMERAL partition. Updated the commands to `apply-config --mode=staged` followed by `reset --system-labels-to-wipe EPHEMERAL --reboot=true`.
- The additional disk example used the old `machine.disks` style. Current Talos disk management uses `UserVolumeConfig` for user volumes mounted under `/var/mnt/<name>`. Replaced the snippet with a `UserVolumeConfig` example.
- The etcd snapshot verification example used `talosctl etcd snapshot db.snapshot --verify`, but the current `talosctl etcd snapshot` command has no `--verify` flag. Replaced it with `talosctl etcd status`.
- The reset lifecycle explanation described graceful reset as only wiping EPHEMERAL. Updated it to explain that `--graceful` controls drain/etcd behavior and the wipe scope is controlled by reset mode or `--system-labels-to-wipe`.

## Review Notes
The post is technically relevant and contains practical commands and configuration. The remaining examples are version-sensitive because Talos storage configuration has evolved toward volume configuration documents; future reviews should re-check against the current Talos release docs.
