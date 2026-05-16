# Validation Summary: How to Use Local Path Provisioner on Talos Linux

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Talos Linux
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClass
- Rancher Local Path Provisioner
- Helm
- kubectl
- Prometheus node filesystem metrics

## Sources Consulted
- Talos Linux local storage guide: https://docs.siderolabs.com/kubernetes-guides/csi/local-storage
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Rancher Local Path Provisioner README: https://github.com/rancher/local-path-provisioner
- Rancher Local Path Provisioner chart values and templates: https://github.com/rancher/local-path-provisioner/tree/v0.0.36/deploy/chart/local-path-provisioner
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found
- Updated the Talos storage configuration to use the current `UserVolumeConfig` workflow and `/var/mnt/local-path-provisioner` path from the Talos local storage guide. The original snippet used a generic kubelet bind mount and `/var/local-path-provisioner`, while current Talos documentation recommends a user volume for Local Path Provisioner.
- Corrected the older `machine.disks` example by removing `size: 0`. Talos documentation says omitting `size` uses the remaining disk; `size: 0` is not the documented way to request the whole disk.
- Updated the Local Path Provisioner manifest URL from `v0.0.26` to `v0.0.36`, the current upstream release checked during validation.
- Added the required Talos namespace Pod Security label and ConfigMap path patch for the direct `kubectl apply` installation. The upstream manifest defaults to `/opt/local-path-provisioner`, which is not the Talos local-storage path.
- Replaced the invalid Helm repository workflow. `https://rancher.github.io/local-path-provisioner/index.yaml` returned 404, so the post now installs from the upstream chart directory after cloning the tagged repository.
- Updated all Local Path Provisioner paths in Helm values, StorageClass parameters, node-specific ConfigMap examples, and Prometheus alert examples to `/var/mnt/local-path-provisioner`.
- Added the missing requirement that `nodePath` values in multiple StorageClass examples must also exist in `nodePathMap` or `storageClassConfigs`, matching the upstream Local Path Provisioner documentation.
- Replaced `kubectl top nodes` as a disk-usage check. That command reports CPU and memory, not filesystem usage; the post now uses `talosctl usage -H` for the local path directory.
- Added the upstream capacity caveat that Local Path Provisioner does not enforce PVC capacity limits, so node-level filesystem monitoring is required.

## Review Notes
- The guide is technically relevant and salvageable. The main problems were outdated Talos storage setup guidance, an invalid Helm repository URL, and a few operational caveats around Local Path Provisioner behavior.
- Local Path Provisioner can support `ReadWriteMany` only when configured with a shared filesystem path. The guide's default node-local storage discussion remains focused on `ReadWriteOnce` use cases.
