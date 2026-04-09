# Validation Summary: How to Set and Get Pool Values in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (OSD pool configuration)
- Rook-Ceph (Kubernetes operator for Ceph)
- Kubernetes (kubectl toolbox access)

## Sources Consulted
- Ceph official documentation on pool operations: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph official documentation on placement groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Rook-Ceph CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph Luminous release notes (removal of crash_replay_interval): https://docs.ceph.com/en/latest/releases/luminous/

## Issues Found
1. **Removed parameter: `crash_replay_interval`** — The "Crash Replay Interval" section referenced the `crash_replay_interval` pool parameter, which was removed from Ceph in the Luminous release (v12.2.x, 2017). Any Ceph version deployed by Rook (Nautilus 14.x and later) does not support this parameter. Attempting to set it would produce `Error EINVAL: unrecognized variable 'crash_replay_interval'`. **Fix:** Removed the entire "Crash Replay Interval" subsection.

## Review Notes
- The summary recommends using the `CephBlockPool` CRD `spec.parameters` field for Rook-managed clusters. This is correct for arbitrary pool parameters, though primary settings like replication size are managed through dedicated CRD fields (e.g., `spec.replicated.size`). The advice is sound as a general principle.
- PG autoscaling is enabled by default in modern Ceph versions (Nautilus+). The post correctly shows how to set `pg_num`/`pgp_num` manually but could note that manual PG management is rarely needed when autoscaling is on. This is a style/completeness observation, not a technical error.
- All other commands, parameters, syntax, and explanations are accurate for current Ceph versions (Quincy, Reef, Squid).
