# Validation Summary: How to Configure Network Fencing for RBD in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (v1.12+)
- Ceph (OSD blocklist)
- Kubernetes (CRDs, Jobs, ConfigMaps)
- CSI Addons Operator (NetworkFence CRD)
- Ceph CSI Driver (RBD)

## Sources Consulted
- kubernetes-csi-addons NetworkFence documentation: https://github.com/csi-addons/kubernetes-csi-addons/blob/main/docs/networkfence.md
- CSI Addons v1alpha1 API reference: https://pkg.go.dev/github.com/csi-addons/kubernetes-csi-addons/api/csiaddons/v1alpha1
- CSI Addons controller deployment guide: https://github.com/csi-addons/kubernetes-csi-addons/blob/main/docs/deploy-controller.md
- Rook Ceph CSI Drivers documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/

## Issues Found
1. **Incorrect Rook operator ConfigMap settings (Step 2):** The post used `CSI_ENABLE_NETWORKFENCE` and `CSI_ADDONS_ENABLE` as ConfigMap keys. Neither of these exist. The correct setting is `CSI_ENABLE_CSIADDONS: "true"`, which enables the CSI Addons sidecar (including network fencing support) in the Rook operator. Fixed to use the single correct key.

2. **Fabricated CSIAddonsNode output column (Step 3):** The example `kubectl get csiaddonsnode` output showed a `NETWORKFENCE` column with value `Supported`. This column does not exist in the standard CSIAddonsNode resource output. Removed the fabricated column to show the standard NAMESPACE, NAME, and AGE columns.

3. **Step 6 title and description mismatch:** The section title said "Automate Fencing with a NetworkFencePolicy" and the description mentioned "NetworkFencePolicy", but the YAML actually showed a `NetworkFenceClass` resource. Fixed the title and description to accurately describe the `NetworkFenceClass` resource being created.

4. **Wrong field name in NetworkFenceClass spec (Step 6):** The `NetworkFenceClass` spec used `driver` as a field name, but the actual CRD uses `provisioner` (which is a required, immutable field). Fixed `driver` to `provisioner`.

## Review Notes
- The `driver`, `secret`, and `parameters` fields used directly in the `NetworkFence` spec (Steps 4, 7, 8) are technically deprecated in favor of referencing a `NetworkFenceClass` via `networkFenceClassName`. The direct approach still works but the post could be updated in the future to show the `NetworkFenceClass`-based approach as the primary method.
- The CSI Addons installation URLs point to the `main` branch on GitHub. The official deployment documentation recommends using versioned release artifacts instead (e.g., `https://github.com/csi-addons/kubernetes-csi-addons/releases/download/${RELEASE}/crds.yaml`). Using `main` is common in tutorials but may lead to unexpected breakage.
- The `apiVersion: csiaddons.openshift.io/v1alpha1` is correct as of the current CSI Addons release. This may change to `v1beta1` or `v1` in future releases.
- The prerequisite about `CephClientInfo` is somewhat misleading — it's not a formal Kubernetes resource but rather internal state maintained by the Rook CSI driver. This is a minor point and doesn't affect the tutorial's correctness.
