# Validation Summary: How to Fix PG_BACKFILL_FULL Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- CRUSH Map and OSD management
- RBD (RADOS Block Device)
- Kubernetes CRDs (CephCluster)

## Sources Consulted
- Ceph Health Checks documentation (https://docs.ceph.com/en/reef/rados/operations/health-checks/)
- Ceph source health-checks.rst (https://github.com/ceph/ceph/blob/main/doc/rados/operations/health-checks.rst)
- Ceph Control Commands (https://docs.ceph.com/en/reef/rados/operations/control/)
- Ceph Troubleshooting OSDs (https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/)
- Ceph Monitoring OSDs and PGs (https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/)
- Rook CephCluster CRD documentation (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Red Hat Ceph Storage Administration Guide — OSD overrides (https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/administration_guide/override-ceph-behavior)

## Issues Found

### 1. Inaccurate example `ceph health detail` output
- **What was wrong:** The example output showed a fabricated message ("Backfill is blocked because the cluster is near full / insufficient space on 3 OSDs for backfill") that does not match actual Ceph output.
- **What was changed:** Replaced with realistic output format: "Low space hindering backfill (add storage if this doesn't resolve itself): N pgs backfill_toofull" followed by specific PG IDs with their states and acting sets.
- **Why:** The real `ceph health detail` output lists specific PGs (not OSDs) with their `backfill_toofull` state and acting OSD sets. Accurate example output helps operators recognize the warning in their own clusters.

### 2. Misleading `ceph osd unset nobackfill` guidance
- **What was wrong:** The post stated "After new OSDs are added, resume backfill" followed by `ceph osd unset nobackfill`, implying this command is always required. In reality, the `nobackfill` flag is never automatically set by Ceph — it is a manual override. In a PG_BACKFILL_FULL scenario, Ceph blocks backfill per-OSD based on the `backfillfull_ratio`, and backfill resumes automatically once space is available.
- **What was changed:** Added clarification that backfill resumes automatically once OSDs drop below the `backfillfull_ratio`, and that the `unset nobackfill` command is only needed if the flag was previously set manually.
- **Why:** Running `ceph osd unset nobackfill` when the flag was never set is harmless but misleading — it suggests manual intervention is required when it isn't.

### 3. Redundant `reweight-by-utilization` invocations
- **What was wrong:** The post showed both `ceph osd reweight-by-utilization` (bare) and `ceph osd reweight-by-utilization 120` on separate lines. Since 120 is the default threshold, both commands are identical. The numeric argument was not explained.
- **What was changed:** Removed the redundant bare invocation, explained what the threshold argument means (OSDs above this percentage of average utilization are reweighted), and changed the example to `110` to demonstrate using a more aggressive threshold that would be useful in a backfill-full scenario.
- **Why:** Showing two identical commands is confusing, and not explaining the argument leaves the reader unable to tune the command for their situation.

## Review Notes
- The `ceph osd set-backfillfull-ratio 0.92` command is correct, but the post could benefit from noting the ordering constraint: `nearfull_ratio < backfillfull_ratio < full_ratio`. With defaults of nearfull=0.85, backfillfull=0.90, full=0.95, raising backfillfull to 0.92 leaves only 3% headroom before the cluster goes full. A cautionary note would be helpful in a future revision.
- The Rook CephCluster YAML snippet for adding nodes is correct but assumes `useAllNodes: false` in the storage spec. If `useAllNodes: true` is set, the `nodes` list is ignored. A future revision could note this prerequisite.
- The `rados` command in Step 3 stats objects rather than deleting them. While the surrounding text says "Delete unused... objects," the command is diagnostic. This is acceptable as-is since operators should identify objects before deleting, but the text could be clarified in a future revision.
