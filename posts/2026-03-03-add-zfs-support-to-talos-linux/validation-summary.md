# Validation Summary: How to Add ZFS Support to Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (system extensions, machine configuration, talosctl)
- OpenZFS (zpool, zfs commands, datasets, snapshots, ARC tuning)
- Talos Image Factory (schematic submission)
- Kubernetes (Pods, PVCs, StorageClass, DaemonSet)
- OpenEBS ZFS LocalPV (CSI provisioner)
- Helm (chart installation)
- Prometheus zfs_exporter

## Sources Consulted
- Talos Linux configuration reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos System Extensions docs: https://www.talos.dev/v1.11/talos-guides/configuration/system-extensions/
- siderolabs/extensions ZFS README: https://github.com/siderolabs/extensions/blob/main/storage/zfs/README.md
- OpenZFS module parameters: https://openzfs.github.io/openzfs-docs/Performance%20and%20Tuning/Module%20Parameters.html
- OpenEBS ZFS LocalPV chart repo: https://openebs.github.io/zfs-localpv/
- OpenEBS Helm chart documentation: https://github.com/openebs/zfs-localpv
- Talos Image Factory: https://factory.talos.dev/
- Mart Roosmaa's "Setting up ZFS on Talos" reference post: https://www.roosmaa.net/blog/2024/setting-up-zfs-on-talos/

## Issues Found

1. **Incorrect Helm repository URL for OpenEBS ZFS LocalPV.** The post previously instructed users to add `https://openebs.github.io/charts` and install `openebs/zfs-localpv`. The legacy `charts` repository is being phased out and the standalone ZFS LocalPV chart is published at the dedicated `https://openebs.github.io/zfs-localpv` repository. Updated the `helm repo add` and `helm install` commands to use the correct repository alias and chart path (`openebs-zfslocalpv/zfs-localpv`), matching the upstream documentation in `openebs/zfs-localpv`.

2. **Incorrect mechanism for setting ZFS ARC parameters.** The "Performance Tuning" section originally placed `module.zfs.zfs_arc_max` and `module.zfs.zfs_arc_min` under `machine.sysctls`. This is wrong: `machine.sysctls` writes to `/proc/sys/`, but ZFS ARC settings are kernel module parameters exposed under `/sys/module/zfs/parameters/` and are conventionally set at module load time. Per the Talos v1alpha1 configuration reference, the correct field is `machine.kernel.modules[].parameters`, which accepts `key=value` strings. Replaced the snippet to use `machine.kernel.modules` with `parameters: [zfs_arc_max=..., zfs_arc_min=...]` and added a one-sentence explanation of why this differs from sysctls.

## Review Notes

- **Deprecation of `machine.install.extensions`**: Starting with Talos v1.5, installing system extensions via `machine.install.extensions` is deprecated in favor of building installer images through Image Factory (Method 2 in the post). The post presents both methods, which is acceptable as Method 1 still works on v1.7.x with a deprecation warning, but a future revision should consider leading with Image Factory or explicitly noting the deprecation.
- **Extension image tag format**: The `ghcr.io/siderolabs/zfs:2.2.2-v1.7.0` tag is consistent with the historical `<zfs-version>-<talos-version>` naming used by siderolabs/extensions. Readers should still cross-reference https://github.com/siderolabs/extensions/pkgs/container/zfs for the exact tag matching their Talos release.
- **`pdf/zfs_exporter:latest`**: This refers to a real community Prometheus exporter (github.com/pdf/zfs_exporter). The `:latest` tag is mutable; production deployments should pin to a specific version.
- **Snapshot date in example (`backup-2024-01-15`)**: Cosmetic only — the syntax is valid ZFS snapshot naming. Left untouched.
- **`nodeName: <gpu-node-name>`**: Placeholder is slightly odd phrasing (suggests a GPU node) but it is just an example placeholder. Left untouched since it does not affect correctness.
