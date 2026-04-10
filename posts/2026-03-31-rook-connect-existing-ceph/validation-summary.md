# Validation Summary: How to Connect Rook to an Existing Ceph Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes storage operator)
- Ceph (distributed storage system, Squid v19.2.0)
- Kubernetes (ConfigMaps, Secrets, PVCs, StorageClasses)
- Ceph CSI drivers (RBD and CephFS)

## Sources Consulted
- Rook official external cluster documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/external-cluster/
- Rook `create-external-cluster-resources.py` script (GitHub rook/rook repository, `deploy/examples/`)
- Rook `import-external-cluster.sh` script (GitHub rook/rook repository, `deploy/examples/`)
- Rook `cluster-external.yaml` example (GitHub rook/rook repository, `deploy/examples/`)
- Ceph documentation on user capabilities and auth: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph Squid release notes: https://docs.ceph.com/en/latest/releases/squid/

## Issues Found

### 1. Missing `osd blocklist` mon capability on all four CSI users
**What was wrong:** All four CSI user creation commands (`csi-rbd-provisioner`, `csi-rbd-node`, `csi-cephfs-provisioner`, `csi-cephfs-node`) were missing `allow command "osd blocklist"` in their mon capabilities. This capability is required for CSI volume fencing — without it, RWO volume failover safety is not guaranteed.
**What was changed:** Added `allow command "osd blocklist"` to the mon caps for all four users.

### 2. Missing `mgr 'allow rw'` on csi-rbd-provisioner
**What was wrong:** The RBD provisioner user was missing `mgr 'allow rw'`, which is required by the CSI RBD provisioner for pool and image management operations.
**What was changed:** Added `mgr 'allow rw'` to the csi-rbd-provisioner auth creation command.

### 3. Missing `mds 'allow *'` on csi-cephfs-provisioner
**What was wrong:** The CephFS provisioner user had no MDS capabilities. The provisioner needs MDS access (`mds 'allow *'`) to create, delete, and resize CephFS subvolumes.
**What was changed:** Added `mds 'allow *'` to the csi-cephfs-provisioner auth creation command.

### 4. CephFS node user had overly restrictive `mds` cap with `fsname=myfs`
**What was wrong:** The csi-cephfs-node user used `mds 'allow rw fsname=myfs'` which can cause compatibility issues with certain CSI operations. The official Rook script uses `mds 'allow rw'` without filesystem restriction.
**What was changed:** Changed to `mds 'allow rw'` to match the official Rook recommendation.

### 5. Wrong key names in CephFS CSI secrets
**What was wrong:** The CephFS provisioner and node secrets used `adminID`/`adminKey` as key names. Rook's CSI driver expects `userID`/`userKey` for all CSI secrets (both RBD and CephFS). Using `adminID`/`adminKey` would cause the CephFS CSI driver to fail to find its credentials.
**What was changed:** Changed `adminID` to `userID` and `adminKey` to `userKey` in both the csi-cephfs-provisioner and csi-cephfs-node secret creation commands.

## Review Notes
- The MON endpoint examples use port 6789 (v1 messenger protocol). Modern Ceph clusters (Nautilus+) also support port 3300 (v2/msgr2). Port 6789 is valid but v2 is preferred for newer clusters.
- The CephCluster spec includes `dataDirHostPath` and `cephVersion.image`, which are not present in the official external cluster example. They are not harmful but are unnecessary for external clusters.
- The flowchart mentions "Create StorageClasses" as a final step, but the post does not include a StorageClass definition. The test PVC in Step 6 references `storageClassName: rook-ceph-block-external` which would need to be created separately for the test to succeed.
- The `rook-ceph-mon` secret could optionally include `ceph-username` and `ceph-secret` fields (used by newer Rook versions for health-checker authentication), though the `admin-secret` field provides backward-compatible operator authentication.
- Ceph v19.2.0 (Squid) is a valid release, confirmed in official Ceph release documentation.
