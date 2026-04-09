# Validation Summary: How to Set MDS Active Count and Active Standby in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph MDS (Metadata Server)
- CephFS (Ceph Filesystem)
- Kubernetes CRDs (CephFilesystem)

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Ceph MDS configuration reference: https://docs.ceph.com/en/latest/cephfs/multimds/
- Ceph MDS standby documentation: https://docs.ceph.com/en/latest/cephfs/standby/
- Rook CephFilesystem API spec (metadataServer fields)

## Issues Found
1. **Fabricated annotation `ceph.io/num-standbys`**: The "Tuning Standby Count" section claimed you could configure extra standby daemons using a `ceph.io/num-standbys` annotation on the metadataServer. This annotation does not exist in the Rook CephFilesystem CRD. The section also referenced a non-existent `standbyCnt` field. Fixed by replacing the section with accurate information: Rook provisions `activeCount * 2` MDS pods when `activeStandby` is true (one standby-replay per active), and extra standbys can be configured via the Ceph config option `mds_standby_count_wanted` using the Ceph CLI directly.

2. **Replaced `ceph mds metadata` with `ceph fs status`**: The original command `ceph mds metadata` outputs raw JSON metadata about all MDS daemons, which is not the most user-friendly way to check standby counts. Changed to `ceph fs status` which provides a clearer tabular view of active and standby MDS daemons.

## Review Notes
- The rest of the post is technically accurate: the CephFilesystem CRD YAML structure, the `activeCount` and `activeStandby` field semantics, the `ceph mds stat` and `ceph fs dump` verification commands, the pod label selector `app=rook-ceph-mds`, and the resource sizing guidance are all correct.
- The description of `activeStandby` enabling standby-replay (journal following) for faster failover is accurate.
- The memory sizing recommendation of 4-8 GiB per MDS daemon for large filesystems is reasonable and aligns with Ceph best practices.
