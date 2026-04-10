# Validation Summary: How to Set Up CSI-Addons Controller for Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph storage orchestrator for Kubernetes)
- Ceph (distributed storage system)
- CSI-Addons (Kubernetes CSI extensions)
- Kubernetes (container orchestration)
- Helm (Kubernetes package manager)

## Sources Consulted
- Rook Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- CSI-Addons controller deployment manifests: https://github.com/csi-addons/kubernetes-csi-addons/tree/main/deploy/controller
- CSI-Addons CRD definitions: https://github.com/csi-addons/kubernetes-csi-addons/tree/main/config/crd/bases
- CSI-Addons ReclaimSpace documentation: https://github.com/csi-addons/kubernetes-csi-addons/blob/main/docs/reclaimspace.md
- Rook RBD provisioner deployment template: https://github.com/rook/rook/blob/master/pkg/operator/ceph/csi/template/rbd/csi-rbdplugin-provisioner-dep.yaml

## Issues Found

1. **Incorrect Helm values structure for CSI-Addons sidecar image**: The post used a single `image` field (`image: quay.io/csiaddons/k8s-sidecar:latest`), but the official Rook Helm chart uses separate `repository` and `tag` fields. Fixed to `repository: quay.io/csiaddons/k8s-sidecar` and `tag: v0.14.0`.

2. **Non-existent `enableCSIAddonsSideCar` Helm value**: The post listed `enableCSIAddonsSideCar: true` as an alternative way to enable CSI-Addons. This setting does not exist in the Rook Helm chart. The correct and only way is via `csi.csiAddons.enabled: true`. Replaced with the correct Helm values snippet.

3. **Grep command wouldn't match all listed CRDs**: The command `kubectl get crd | grep csiaddons` would only match CRDs under the `csiaddons.openshift.io` API group, but the expected output also included `volumereplicationclasses.replication.storage.openshift.io` and `volumereplications.replication.storage.openshift.io` which don't contain "csiaddons". Fixed the grep to `grep -E "csiaddons|replication"` to match all listed CRDs.

## Review Notes
- The deployment manifest URLs point to the `main` branch, which means they will always pull the latest version. For production use, pinning to a specific release tag would be more reliable.
- The `v1alpha1` API version for ReclaimSpaceJob is correct as of current releases, but users should watch for API graduation to `v1beta1` or `v1` in future CSI-Addons releases.
- The post correctly identifies all three major CSI-Addons features (ReclaimSpace, VolumeReplication, NetworkFence) and their corresponding CRDs.
