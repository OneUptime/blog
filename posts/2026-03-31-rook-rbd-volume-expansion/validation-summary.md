# Validation Summary: How to Enable Volume Expansion for Rook RBD StorageClass

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes (PersistentVolumeClaims, StorageClass, CSI)
- Rook Ceph (RBD CSI driver)
- Ceph (RBD block storage)
- kubectl CLI

## Sources Consulted
- Kubernetes official documentation on volume expansion: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#expanding-persistent-volumes-claims
- Kubernetes feature gates reference (ExpandPersistentVolumes, ExpandCSIVolumes): https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kubernetes CSI specification for StorageClass parameters: https://kubernetes-csi.github.io/docs/
- Rook Ceph documentation on RBD StorageClass: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- kubectl wait documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found

### Issue 1: Incorrect `kubectl wait` command in offline expansion workflow (Step 7)
- **What was wrong:** The command `kubectl wait --for=condition=FileSystemResizePending=False pvc/expandable-pvc` was used before scaling the deployment back up. This would hang indefinitely because `FileSystemResizePending` only becomes False after a pod mounts the volume and triggers `NodeExpandVolume` (filesystem resize). Since the deployment is scaled to 0, no pod will ever mount the volume.
- **What was changed:** Replaced with `kubectl wait --for=condition=FileSystemResizePending pvc/expandable-pvc --timeout=120s`, which waits for the condition to become True (indicating the controller-side RBD image expansion completed). The pod is then scaled back up, and filesystem resize happens automatically on mount.
- **Why:** The original command created a deadlock in the offline expansion workflow. The corrected command properly waits for the controller expansion to finish, then allows the pod to start and handle the filesystem resize.

### Issue 2: Misleading version characterization in prerequisites (line 37)
- **What was wrong:** "Kubernetes v1.16+ (stable volume expansion)" implied volume expansion was stable/GA at v1.16. CSI volume expansion (`ExpandCSIVolumes` feature gate) was beta at v1.16 and did not reach GA until 1.24.
- **What was changed:** Updated to "Kubernetes v1.16+ (CSI volume expansion beta and enabled by default; GA since 1.24)" for accuracy.
- **Why:** Calling a beta feature "stable" is misleading. The corrected text accurately describes the feature gate status.

## Review Notes
- The post does not mention the `ExpandCSIVolumes` feature gate, which was a separate gate specifically for CSI volume expansion (alpha 1.14, beta 1.16, GA 1.24). Since it was enabled by default in the same version range as `ExpandPersistentVolumes`, this omission does not cause practical issues, but could be added for completeness.
- The StorageClass comment "These features are required for online expansion" about `imageFeatures` is slightly overstated. While these features are recommended best practice for Rook RBD, not all of them are strictly required for volume expansion specifically. `exclusive-lock` is the most relevant for online operations.
- The troubleshooting command `resize2fs /dev/rbd0` uses a hardcoded device name. In practice, the RBD device number varies. This is acceptable as an illustrative example but users should determine the actual device path.
- All YAML manifests, kubectl commands, CSI secret parameter names, and the Mermaid workflow diagram are technically correct.
