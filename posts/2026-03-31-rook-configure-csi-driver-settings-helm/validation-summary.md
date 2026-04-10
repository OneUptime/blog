# Validation Summary: How to Configure CSI Driver Settings (RBD, CephFS, NFS) in Rook Helm

## Status
validated

## Post Type
Configuration Guide

## Technologies Covered
- Rook-Ceph operator (Kubernetes storage orchestrator)
- Ceph CSI drivers (RBD, CephFS, NFS)
- Kubernetes CSI (Container Storage Interface)
- Helm chart configuration
- Kubernetes DaemonSet and Deployment update strategies

## Sources Consulted
- Rook Helm chart values.yaml on GitHub (rook/rook repository, deploy/charts/rook-ceph/values.yaml, master branch) — https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook official documentation — https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/
- Previously validated blog post `rook-non-default-namespace-csi-drivers` which confirmed the `csi.nfs.enabled` value path
- Kubernetes CSI specification for FSGroupPolicy values

## Issues Found

### 1. Incorrect NFS driver enable value name (FIXED)
- **What was wrong:** The post used `csi.enableNFSDriver: false` and `csi.enableNFSDriver: true` in two locations. This Helm value does not exist in the Rook chart.
- **What was changed:** Updated to `csi.nfs.enabled: false` / `csi.nfs.enabled: true` using the correct nested YAML structure (`csi.nfs.enabled`).
- **Why:** The Rook Helm chart uses `csi.nfs.enabled` as a nested value under `csi.nfs`, not a flat `enableNFSDriver` key. The incorrect name would be silently ignored by Helm.

### 2. Incorrect CephFS FUSE/kernel client setting (FIXED)
- **What was wrong:** The post used `csi.cephFSFUSEClient: false` and explained that setting it to `true` forces the FUSE client. This value does not exist in the Rook Helm chart.
- **What was changed:** Updated to `csi.forceCephFSKernelClient: true` and corrected the explanation to say that setting `forceCephFSKernelClient: false` allows the FUSE client.
- **Why:** The actual Helm value is `forceCephFSKernelClient` (default `true`), which forces the kernel CephFS client. Setting it to `false` allows FUSE. The logic is inverted from what the post originally described.

### 3. Incorrect CephFS plugin update strategy capitalization (FIXED)
- **What was wrong:** The post used `cephfsPluginUpdateStrategy` and `cephfsPluginUpdateStrategyMaxUnavailable` (lowercase "fs").
- **What was changed:** Updated to `cephFSPluginUpdateStrategy` and `cephFSPluginUpdateStrategyMaxUnavailable` (capital "FS").
- **Why:** The Rook Helm chart uses `cephFS` capitalization (matching the CephFS product name) for all CephFS-related values. The incorrectly capitalized keys would be silently ignored by Helm.

### 4. Incorrect and non-existent mount option value names (FIXED)
- **What was wrong:** The post used `fuseMountOptions: ""` and `kernelMountOptions: "ms_mode=prefer-crc"`. Neither of these value names exists in the Rook Helm chart.
- **What was changed:** Removed `fuseMountOptions` entirely (no equivalent exists). Renamed `kernelMountOptions` to `cephFSKernelMountOptions`.
- **Why:** The Rook chart provides `csi.cephFSKernelMountOptions` for kernel client mount options. There is no separate FUSE mount options Helm value. The `fuseMountOptions` entry would have been silently ignored.

### 5. Incorrect CSI sidecar image value paths (FIXED)
- **What was wrong:** The post used `csi.registrar.image.tag`, `csi.provisioner.image.tag`, etc. with an extra `.image.` nesting level that does not exist.
- **What was changed:** Updated to `csi.registrar.tag`, `csi.provisioner.tag`, `csi.attacher.tag`, `csi.resizer.tag` (flat `repository`/`tag` keys directly under each sidecar name).
- **Why:** The Rook Helm chart uses `csi.<sidecar>.tag` directly, not `csi.<sidecar>.image.tag`. The incorrect paths would be silently ignored.

### 6. Outdated CSI sidecar image versions (FIXED)
- **What was wrong:** The post listed outdated sidecar versions: registrar v2.9.0, provisioner v3.7.0, attacher v4.4.0, resizer v1.9.0.
- **What was changed:** Updated to current versions: registrar v2.16.0, provisioner v6.1.1, attacher v4.11.0, resizer v2.1.0.
- **Why:** The versions in the post were several major releases behind. Using outdated sidecar versions can cause compatibility issues with newer Kubernetes and Ceph CSI driver releases.

## Review Notes
- The post uses `OnDelete` for all plugin update strategies, while the Rook chart defaults to `RollingUpdate`. Using `OnDelete` is a valid choice (it prevents automatic restarts of CSI DaemonSet pods during upgrades), but readers should be aware this is not the default.
- The `enableCSIHostNetwork` value is shown as `false` in the post, while the chart default is `true`. This is a valid configuration choice but differs from the default.
- The `enableOMAPGenerator: true` shown in the RBD section defaults to `false` in the chart and is only needed for RBD mirroring scenarios. The post does not clarify when this should be enabled.
- Modern Rook versions (v1.15+) support `rookUseCsiOperator: true` which delegates CSI management to the ceph-csi-operator. This fundamentally changes how CSI drivers are configured and may make some of these direct Helm values less relevant in the future.
- The `ms_mode=prefer-crc` kernel mount option is a valid Ceph msgr2 protocol setting for CephFS kernel mounts.
