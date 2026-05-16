# Validation Summary: How to Set Up Kubelet Extra Mounts in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- Talos kubelet `extraMounts`
- Talos user volumes and mount status resources
- Kubernetes `hostPath` volumes
- Kubernetes mount propagation
- `talosctl`

## Sources Consulted
- Talos MachineConfig reference for `machine.kubelet.extraMounts`: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos user volumes documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/user
- Talos volume and mount resources documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/resources
- Talos CLI reference for `apply-config`, `patch`, `mounts`, and `service`: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Kubernetes volumes documentation for `hostPath`, CSI, and mount propagation: https://kubernetes.io/docs/concepts/storage/volumes/

## Issues Found
- The post used the older `machine.disks` pattern for dedicated local storage. Replaced those examples with current `UserVolumeConfig` snippets and explained that Talos mounts user volumes at `/var/mnt/<name>`.
- The post implied `/var/mnt` user-volume paths always require kubelet `extraMounts`. Updated the text to reflect Talos documentation that user volumes mounted under `/var/mnt/<name>` are automatically propagated into the kubelet container.
- The CSI example claimed `/var/lib/kubelet` and `/var/lib/csi` extra mounts are required for many CSI drivers. Reworked the example to use a generic custom CSI path and clarified that driver-specific documentation should determine required host paths.
- The verification example used `talosctl mounts`. Replaced it with `talosctl get mountstatus`, which aligns with current Talos volume and mount resource documentation for checking managed mounts.
- The conclusion described kubelet extra mounts as essential for local storage. Updated this to say they are useful for custom host paths, some CSI drivers, and device access, because Talos user volumes cover the common local-storage path.

## Review Notes
The remaining Talos `extraMounts` examples match the documented `destination`, `type`, `source`, and `options` fields. The Kubernetes `hostPath` example uses a valid `Directory` type. The post does not pin a Talos version, so the review was performed against current Talos documentation available on 2026-05-16.
