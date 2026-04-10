# Validation Summary: How to Compare Ceph vs Lustre for HPC Storage

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Ceph (CephFS, RADOS Gateway)
- Lustre (MDS, MDT, OSS, OST, LNET, PCC)
- Rook (Ceph Kubernetes operator)
- Kubernetes (StorageClass, CSI)
- MPI-IO (parallel I/O)
- AWS CLI (S3-compatible endpoint usage)

## Sources Consulted
- Lustre documentation: architecture components (MGS, MDS/MDT, OSS/OST, LNET) — https://doc.lustre.org/
- Lustre `lfs` CLI reference for `getstripe` and `setstripe` commands — https://doc.lustre.org/lustre_manual.xhtml
- Lustre DNE (Distributed Namespace Environment) documentation — confirms DNE is metadata distribution, not burst buffers
- Lustre Persistent Client Cache (PCC) documentation — confirmed as the burst buffer mechanism
- Rook CephFS CSI StorageClass documentation — https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Ceph CephFS mount documentation — https://docs.ceph.com/en/latest/cephfs/
- Ceph RADOS Gateway (RGW) S3-compatible API documentation

## Issues Found
1. **Architecture table: "MDT + MGS" listed as Lustre metadata servers** — MDT is a Metadata Target (storage), not a server. The MDS (Metadata Server) is the server component. Changed "MDT + MGS" to "MDS + MGS" to correctly reference the server daemons.

2. **Architecture table: LNET listed as a protocol alongside POSIX** — LNET is Lustre's networking/transport layer (analogous to TCP/IP), not a client access protocol like NFS or POSIX. Changed "POSIX, LNET" to "POSIX (over LNET)" to clarify the relationship.

3. **Performance table: "DNE Burst Buffers" claimed as Lustre burst buffer feature** — DNE (Distributed Namespace Environment) is a metadata distribution feature that splits the namespace across multiple MDTs for scalability. It is not a burst buffer mechanism. Lustre's actual burst buffer functionality comes from Persistent Client Cache (PCC) and flash-based OSTs. Changed "Yes (DNE Burst Buffers)" to "Yes (via PCC and flash OSTs)".

4. **StorageClass YAML missing required `clusterID` parameter** — The Rook CephFS CSI driver requires the `clusterID` parameter in the StorageClass. Without it, volume provisioning will fail. Added `clusterID: rook-ceph` to the parameters.

## Review Notes
- The `mount -t ceph ceph-mon:6789:/ /mnt/cephfs` command uses the legacy v1 msgr port (6789). Modern Ceph deployments default to v2 msgr on port 3300, though 6789 remains widely supported. This is acceptable for a general example.
- The StorageClass example is simplified and omits secret references (`csi.storage.k8s.io/provisioner-secret-name`, etc.) that would be needed in a production deployment. This is acceptable for a comparison blog post but readers should consult Rook documentation for complete examples.
- The qualitative performance ratings (Good/Excellent/Moderate) in the comparison tables are reasonable generalizations consistent with published HPC benchmarks, though actual performance varies significantly by hardware, configuration, and workload characteristics.
