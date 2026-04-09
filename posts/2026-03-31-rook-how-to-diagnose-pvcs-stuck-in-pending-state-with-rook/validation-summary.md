# Validation Summary: How to Diagnose PVCs Stuck in Pending State with Rook

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes PersistentVolumeClaims (PVCs)
- Kubernetes CSI (Container Storage Interface)
- kubectl CLI

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-csi-common-issues/
- Rook CSI driver documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/
- Kubernetes CSI driver documentation: https://kubernetes-csi.github.io/docs/
- Kubernetes PVC documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Ceph auth documentation: https://docs.ceph.com/en/latest/rados/operations/user-management/
- kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found

### Issue 1: Incorrect CSI secret recreation guidance (Step 4)
**What was wrong:** The post suggested running `ceph auth get-or-create client.csi-rbd-provisioner` as an alternative to reapplying operator manifests for recreating missing Kubernetes secrets. However, `ceph auth get-or-create` only creates/retrieves the Ceph auth entity — it does not create the corresponding Kubernetes secret. Users following this command would still have missing Kubernetes secrets.

**What was changed:** Replaced the `ceph auth get-or-create` command with `kubectl -n rook-ceph rollout restart deploy/rook-ceph-operator` as the primary fix (the Rook operator automatically manages these secrets). Reframed the Ceph auth command as a verification step using `ceph auth get` to check if the underlying auth entity exists.

**Why:** The Rook operator is responsible for creating and managing the Kubernetes secrets that the CSI provisioner and node plugins use. Restarting the operator is the correct way to trigger secret recreation. The original command would only address the Ceph side, leaving the Kubernetes secret still missing.

### Issue 2: Incorrect `kubectl get csidrivers` output format (Step 6)
**What was wrong:** The expected output showed only the driver name and an ISO timestamp (e.g., `rook-ceph.rbd.csi.ceph.com   2026-03-30T12:00:00Z`). The actual `kubectl get csidrivers` output includes multiple columns (ATTACHREQUIRED, PODINFOONMOUNT, STORAGECAPACITY, TOKENREQUESTS, REQUIRESREPUBLISH, MODES, AGE) and displays age as relative time (e.g., "10d"), not ISO format.

**What was changed:** Updated the expected output to match the actual `kubectl get csidrivers` column format with realistic values.

**Why:** Users comparing their actual output to the example would see a different format and potentially think something was wrong. Showing the real format helps users correctly identify whether their CSI drivers are registered.

## Review Notes
- The `ceph auth` capabilities for the CSI provisioner may vary by Rook version. Modern Rook versions (1.12+) may also require `mgr 'allow rw'` capabilities. Since the command was changed to a read-only verification (`ceph auth get`), this is no longer a concern in the post.
- The post uses `replicapool` as the example pool name, which matches Rook's default example manifests. This is appropriate for a general troubleshooting guide.
- All kubectl command syntax, Ceph CLI commands, and Kubernetes resource names/labels were verified as correct.
