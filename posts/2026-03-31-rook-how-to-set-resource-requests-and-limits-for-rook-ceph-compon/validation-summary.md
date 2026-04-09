# Validation Summary: How to Set Resource Requests and Limits for Rook-Ceph Components

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (MON, MGR, OSD, MDS, RGW daemons)
- Kubernetes (resource requests/limits, CRDs, kubectl)

## Sources Consulted
- Rook CephCluster CRD documentation (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook CephFilesystem CRD documentation (https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/)
- Rook CephObjectStore CRD documentation (https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/)
- Rook example cluster.yaml (https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml)
- Cross-referenced with other validated Rook blog posts in this repository (rook-deploy-cephcluster-cr, rook-cephfilesystem-crd, rook-create-cephobjectstore)
- Ceph documentation on monitor store and OSD memory target

## Issues Found

### Issue 1: MDS and RGW resources incorrectly placed under CephCluster CRD
- **What was wrong:** The post showed `mds` and `rgw` keys under `CephCluster.spec.resources`, implying these resource settings would take effect there. In reality, the Rook operator only reads MON, MGR, OSD (and sidecar/utility) resources from the CephCluster CRD. MDS resources must be configured in `CephFilesystem.spec.metadataServer.resources` and RGW resources in `CephObjectStore.spec.gateway.resources`. Setting `mds`/`rgw` under CephCluster.spec.resources has no effect.
- **What was changed:** Removed `mds` and `rgw` from the CephCluster YAML example. Updated the MDS section to show the correct `CephFilesystem` CRD structure. Updated the RGW section to show the correct `CephObjectStore` CRD structure. Added clarifying notes about which CRD manages which daemon's resources. Updated the description and summary to reflect the multi-CRD approach.

### Issue 2: Outdated LevelDB reference for monitor store
- **What was wrong:** Line 80 stated monitors run "a LevelDB/RocksDB store." All Ceph versions supported by Rook (Nautilus 14.x and later) use RocksDB exclusively for the monitor store. LevelDB was the default in Luminous and earlier versions but has been deprecated and removed.
- **What was changed:** Changed "LevelDB/RocksDB" to "RocksDB".

## Review Notes
- The resource values recommended in the post (CPU/memory for each daemon type) are reasonable and align with common Rook-Ceph deployment practices.
- The `osd_memory_target` value of 4294967296 (4 GiB) and the 25-50% buffer recommendation are correct.
- The `kubectl` commands for monitoring resource usage and OOM kills are correct.
- The development vs. production presets section only covered CephCluster-level daemons (mgr, mon, osd), which is correct after the fix.
- The post could benefit from mentioning `prepareosd`, `crashcollector`, `logcollector`, and `cleanup` resource keys that are also available in the CephCluster CRD, but this is not a correctness issue.
