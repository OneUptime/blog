# Validation Summary: How to Use NVMe Disks with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- NVMe block devices
- talosctl
- Kubernetes PersistentVolumes and StorageClasses
- Rook-Ceph
- nvme-cli

## Sources Consulted
- Talos Linux v1.13 MachineConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config
- Talos Linux v1.13 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos Linux v1.13 disk management overview: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-management/overview
- Talos Linux v1.13 user volumes documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-management/user
- Talos Linux v1.13 disk selector/common storage configuration: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-management/common
- Talos Linux GitHub releases: https://github.com/siderolabs/talos/releases
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Volumes documentation for local volumes: https://kubernetes.io/docs/concepts/storage/volumes/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- IBM Linux NVMe device documentation: https://www.ibm.com/docs/en/linux-on-systems?topic=sdd-nvme-2

## Issues Found
- The installer image example used `ghcr.io/siderolabs/installer:v1.7.0`, which is outdated for a current Talos guide. Updated it to `ghcr.io/siderolabs/installer:v1.13.2`, matching the latest Talos release available during review.
- The additional storage examples used the older `machine.disks` configuration shape. Current Talos storage documentation uses `UserVolumeConfig` documents for user-managed local volumes. Replaced those snippets with `apiVersion: v1alpha1`, `kind: UserVolumeConfig`, `diskSelector`, and `minSize` examples.
- The local PersistentVolume example configured Talos storage with the older disk partition syntax. Updated the Talos side to a `UserVolumeConfig` mounted at `/var/mnt/nvme-storage`, preserving the Kubernetes PV and StorageClass pattern.
- The multiple-disk example used the older `machine.disks` syntax. Updated it to separate `UserVolumeConfig` documents for the `database` and `cache` volumes.
- The stable disk naming example used a direct `/dev/disk/by-id/` path under `machine.install.disk`. Updated the recommendation to include Talos `diskSelector` and changed the snippet to use `machine.install.diskSelector.wwid`, which is documented for stable install disk selection.

## Review Notes
The Kubernetes local PersistentVolume and StorageClass examples are valid for static local volumes with `kubernetes.io/no-provisioner` and `WaitForFirstConsumer`. The Rook-Ceph device selection example is consistent with the CephCluster CRD, but production deployments should prefer stable device paths such as `/dev/disk/by-id/...` where possible.
