# Validation Summary: How to Set NOSCRUB and NODEEP_SCRUB Pool Flags

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl CLI)
- Ceph scrubbing subsystem (light scrub, deep scrub)
- Ceph pool flags (noscrub, nodeep-scrub)

## Sources Consulted
- Ceph official documentation on scrubbing: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/#scrubbing
- Ceph official documentation on pool operations: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph official documentation on OSD flags: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Rook documentation on the Ceph toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found

### Issue 1: Cluster-wide commands missing kubectl exec prefix
- **What was wrong:** The "Cluster-Wide Scrub Control" section showed bare `ceph` commands (e.g., `ceph osd set noscrub`) without the `kubectl exec -n rook-ceph deploy/rook-ceph-tools --` prefix used consistently throughout the rest of the post. Since the post is specifically about Rook/Kubernetes environments, these commands would not work as written.
- **What was changed:** Added the `kubectl exec -n rook-ceph deploy/rook-ceph-tools --` prefix to all four commands in the cluster-wide section (set noscrub, set nodeep-scrub, unset noscrub, unset nodeep-scrub).
- **Why:** Consistency with the rest of the post and correctness in a Rook/Kubernetes environment where Ceph CLI is only accessible through the toolbox pod.

### Issue 2: Inaccurate health warnings section
- **What was wrong:** The health warnings section stated "If `noscrub` or `nodeep-scrub` remain set too long, Ceph generates health warnings" and showed the `noscrub flag(s) set` / `nodeep-scrub flag(s) set` warnings. This was inaccurate in two ways: (1) these specific warnings are for cluster-level flags, not per-pool flags, and they appear immediately when set, not after "too long"; (2) per-pool noscrub flags produce different warnings (`PG_NOT_SCRUBBED` / `PG_NOT_DEEP_SCRUBBED`) and only after scrub interval thresholds are exceeded.
- **What was changed:** Clarified that the `flag(s) set` warnings are for cluster-level flags and appear immediately. Added information about per-pool flag behavior producing `PG_NOT_SCRUBBED` / `PG_NOT_DEEP_SCRUBBED` warnings after configured thresholds are exceeded.
- **Why:** The post focuses on per-pool flags, so readers need to understand the different warning behavior between pool-level and cluster-level flags to correctly interpret Ceph health output.

## Review Notes
- The scrubbing frequency table states light scrubs run "Daily by default" and deep scrubs "Weekly by default." These are correct defaults (`osd_scrub_min_interval` = 86400s / 1 day, `osd_deep_scrub_interval` = 604800s / 1 week), though actual scrub scheduling also depends on `osd_scrub_max_interval` and load conditions.
- The `ceph pg ls scrubbing` and `ceph pg ls deep-scrubbing` commands should work in recent Ceph releases but the state filter syntax may vary across versions. An alternative approach is `ceph pg dump | grep scrub` which works universally.
- The post uses `replicapool` as the example pool name, which is Rook's default pool name. This is appropriate for the target audience.
- All `ceph osd pool set/get` commands use correct syntax and flag names (`noscrub`, `nodeep-scrub`).
