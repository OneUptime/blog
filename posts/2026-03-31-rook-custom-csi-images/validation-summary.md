# Validation Summary: How to Configure Custom CSI Images in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph CSI (Container Storage Interface) driver
- Kubernetes ConfigMaps, Deployments, DaemonSets, ServiceAccounts
- skopeo (container image mirroring tool)
- kubectl CLI

## Sources Consulted
- Rook Custom Images documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/custom-images/
- Rook GitHub source — custom-images.md: https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Ceph-CSI/custom-images.md
- Rook CSI source code (csi.go, spec.go): https://github.com/rook/rook/blob/master/pkg/operator/ceph/csi/csi.go
- Rook operator.yaml example: https://github.com/rook/rook/blob/master/deploy/examples/operator.yaml
- Rook common.yaml (service accounts with imagePullSecrets): https://github.com/rook/rook/blob/master/deploy/examples/common.yaml
- Rook Ceph CSI Drivers documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml

## Issues Found

### Issue 1: Incorrect ConfigMap key for image pull policy
- **What was wrong:** The post used `CSI_IMAGE_PULL_POLICY` as the ConfigMap key for image pull policy (missing the `ROOK_` prefix).
- **What was changed:** Corrected to `ROOK_CSI_IMAGE_PULL_POLICY`.
- **Why:** All CSI-related operator config keys use the `ROOK_CSI_` prefix, as confirmed in the Rook source code (`pkg/operator/ceph/csi/csi.go`).

### Issue 2: imagePullSecrets section conflated pull policy with pull secrets
- **What was wrong:** The section titled "Configure imagePullSecrets" showed setting `CSI_IMAGE_PULL_POLICY: "IfNotPresent"` as if that configured pull secrets. Image pull policy (when to pull) and image pull secrets (authentication credentials) are entirely different concepts. There is no ConfigMap key to configure pull secrets for CSI pods.
- **What was changed:** Rewrote the section to show the correct approach: patching the CSI service accounts (`rook-csi-rbd-plugin-sa`, `rook-csi-rbd-provisioner-sa`, `rook-csi-cephfs-plugin-sa`, `rook-csi-cephfs-provisioner-sa`) with `imagePullSecrets`. Moved the pull policy snippet to a separate, correctly labeled block.
- **Why:** Pull secrets for CSI pods in Rook are configured via the CSI service accounts (as shown in Rook's `common.yaml`) or via Helm values, not through the operator ConfigMap.

### Issue 3: Manual CSI pod restart presented as required step
- **What was wrong:** The post instructed readers to manually restart all CSI pods after updating the ConfigMap, as if this were a required step.
- **What was changed:** Updated the section to explain that the Rook operator automatically detects ConfigMap changes and reconciles CSI pods. Manual restart commands are kept as a fallback option.
- **Why:** The Rook operator includes a config controller that watches the `rook-ceph-operator-config` ConfigMap and triggers reconciliation of CSI resources when changes are detected.

## Review Notes
- The post omits the `ROOK_CSIADDONS_IMAGE` variable, which controls the CSI Addons sidecar image (`quay.io/csiaddons/k8s-sidecar`). This is not an error since the CSI Addons sidecar is optional, but could be mentioned for completeness.
- The CSI sidecar image versions shown (e.g., csi-provisioner v4.0.1, csi-attacher v4.5.1) are valid versions but may not match the defaults for the latest Rook release. The current Rook master uses newer versions (e.g., csi-provisioner v6.1.1). Since the post is about overriding images with custom versions, the specific versions shown are acceptable as examples.
