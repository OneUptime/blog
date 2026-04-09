# Validation Summary: How to Migrate from GlusterFS to Ceph

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- GlusterFS (distributed file system)
- Ceph / CephFS (distributed storage)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (PVCs, Deployments, Pods, kubectl)
- rsync (data migration)

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook quickstart / deployment examples: https://rook.io/docs/rook/latest/Getting-Started/quickstart/
- GlusterFS snapshot documentation: https://docs.gluster.org/en/latest/Administrator-Guide/Managing-Snapshots/
- GlusterFS quota documentation: https://docs.gluster.org/en/latest/Administrator-Guide/Directory-Quota/
- CephFS architecture and access methods: https://docs.ceph.com/en/latest/cephfs/
- Kubernetes PersistentVolume spec for GlusterFS: https://kubernetes.io/docs/concepts/storage/volumes/#glusterfs
- kubectl patch documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found

1. **Overview incorrectly claimed GlusterFS "lacks" snapshots and quotas**: The original text stated GlusterFS "lacks many features that CephFS provides - snapshots, quotas, tiering, and active-active MDS." However, the post itself demonstrates GlusterFS snapshots in Step 3, and the comparison table lists GlusterFS as having both snapshots and quotas. Changed to clarify that CephFS provides stronger Kubernetes-native integration for snapshots/quotas, while GlusterFS truly lacks tiering and active-active MDS.

2. **Sync pod would exit before Step 5 exec**: The pod spec in Step 4 ran rsync and then exited. In Step 5, `kubectl exec` into this pod would fail because the container would be in `Completed` state. Added `sleep infinity` after the initial sync so the pod remains running and available for the final incremental sync in Step 5.

3. **GlusterFS quota terminology**: The comparison table listed GlusterFS quotas as "Project quotas." GlusterFS uses "directory quotas" (and volume-level quotas), not project quotas. Changed to "Directory quotas."

4. **CephFS multi-protocol listing was incomplete**: The comparison table listed CephFS multi-protocol support as only "NFS via Ganesha." CephFS is primarily accessed via its native protocol (kernel client or FUSE mount), with NFS via Ganesha as an additional option. Changed to "Native (kernel/FUSE), NFS via Ganesha."

## Review Notes
- The Rook deployment URLs point to the `master` branch on GitHub. For production deployments, users should reference a specific release tag (e.g., `release-1.14`) for stability. This is a best-practice consideration rather than a technical error.
- The `--delete` flag in rsync during the initial sync (Step 4, while apps are still writing) could remove files on the destination that haven't been synced yet if files are renamed on the source. This is acceptable for the final sync but worth noting for the initial sync. The post's approach is still valid since the final sync re-runs with `--delete` after applications are stopped.
- GlusterFS's Heketi provisioner is correctly noted as deprecated. The in-tree GlusterFS volume plugin in Kubernetes was also removed in Kubernetes 1.26+, which could be worth mentioning for users on newer Kubernetes versions.
