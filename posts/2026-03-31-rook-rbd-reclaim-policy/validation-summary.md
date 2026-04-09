# Validation Summary: How to Configure Reclaim Policies for Rook RBD Volumes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes (PersistentVolumes, PersistentVolumeClaims, StorageClasses, reclaim policies)
- Rook Ceph CSI RBD (block storage provisioner)
- Ceph RBD (RADOS Block Device image management)

## Sources Consulted
- Kubernetes Persistent Volumes documentation — https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Storage Object in Use Protection — https://kubernetes.io/docs/concepts/storage/persistent-volumes/#storage-object-in-use-protection
- Kubernetes 1.31 PV leak prevention blog — https://kubernetes.io/blog/2024/08/16/kubernetes-1-31-prevent-persistentvolume-leaks-when-deleting-out-of-order/
- Rook Ceph CSI Drivers documentation — https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- ceph-csi static PVC documentation — https://github.com/ceph/ceph-csi/blob/devel/docs/static-pvc.md
- ceph-csi volume handle format (issue #1894) — https://github.com/ceph/ceph-csi/issues/1894

## Issues Found

### 1. Mermaid diagram — Delete path incorrectly showed "PV enters Released state"
- **What was wrong:** The flowchart showed the Delete reclaim policy path as: PVC Deleted → PV enters Released state → Rook CSI deletes RBD image → PV deleted. With the Delete policy, the PV is automatically cleaned up by the CSI driver without lingering in a user-observable Released state. Showing "Released" on both paths conflates the Delete behavior with Retain, where Released is the persistent terminal state requiring admin action.
- **What was changed:** Simplified the Delete path to: PVC Deleted → Rook CSI deletes RBD image → PV deleted automatically.
- **Why:** Prevents readers from thinking they'll see Released PVs when using the Delete policy, which could cause confusion during troubleshooting.

### 2. Step 5 — Incorrect RBD image name extraction from CSI volume handle
- **What was wrong:** The command `awk -F'-' '{print $NF}'` was used to extract the RBD image identifier from the CSI volume handle. CSI volume handles for Rook RBD follow the format `0001-0024-rook-ceph-0000000000000001-<uuid>` where `<uuid>` is a standard UUID containing hyphens (e.g., `e42b528e-0666-11ee-a902-0a580a800213`). Using `awk -F'-'` with `$NF` would only return the last hyphen-delimited segment of the UUID (e.g., `0a580a800213`), not the full UUID. The subsequent `rbd rm replicapool/csi-vol-${RBD_IMAGE}` command would therefore fail.
- **What was changed:** Replaced the volume handle extraction approach with `kubectl get pv <pv-name> -o jsonpath='{.spec.csi.volumeAttributes.imageName}'`, which directly returns the full RBD image name (e.g., `csi-vol-e42b528e-0666-11ee-a902-0a580a800213`) without any string parsing.
- **Why:** The original command would produce an incorrect image name and the `rbd rm` would fail or, worse, could target the wrong image.

### 3. Step 6 — Misleading use of `kubernetes.io/pvc-protection` finalizer
- **What was wrong:** The post suggested manually adding the `kubernetes.io/pvc-protection` finalizer to prevent accidental PVC deletion, with a comment stating it "prevents the PVC from being deleted until explicitly removed." This is incorrect: (1) `kubernetes.io/pvc-protection` is automatically added by Kubernetes to all PVCs when the Storage Object in Use Protection feature is enabled (default since v1.10), (2) this finalizer only delays deletion while a Pod is actively using the PVC — once no Pod references it, the controller automatically removes the finalizer and deletion proceeds, (3) it does not require or respond to manual removal by an admin.
- **What was changed:** Replaced with a custom finalizer (`example.com/prevent-accidental-deletion`) that genuinely blocks deletion until an admin explicitly removes it, since no built-in controller manages custom finalizers.
- **Why:** Using the Kubernetes-managed finalizer would give a false sense of protection — the PVC could still be deleted when not mounted by any Pod.

## Review Notes
- The StorageClass YAML configurations are correct and use standard Rook CSI RBD parameters, secret names, and namespace conventions.
- The `kubectl patch pv` command to change reclaim policy on an existing PV is correct.
- The PV rebinding workflow (removing claimRef, creating a new PVC with volumeName) is accurate.
- The Python audit script in Step 7 is syntactically correct and uses the right PV JSON structure.
- The `Retain` policy recommendation for production stateful workloads in the summary is sound operational advice.
