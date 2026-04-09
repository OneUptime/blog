# Validation Summary: How to Fix TOO_MANY_PGS Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster, health checks, Placement Groups, OSDs, PG autoscaler)
- Rook (Kubernetes Ceph operator, CephCluster CRD)
- Kubernetes (kubectl)

## Sources Consulted
- Ceph official documentation on Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation on the PG Autoscaler module: https://docs.ceph.com/en/latest/rados/operations/placement-groups/#autoscaling-placement-groups
- Ceph official documentation on pool operations: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph health checks reference: https://docs.ceph.com/en/latest/rados/operations/health-checks/#too-many-pgs
- Ceph Nautilus release notes (PG merging feature): https://docs.ceph.com/en/latest/releases/nautilus/
- Rook documentation on CephCluster CRD and OSD management: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/

## Issues Found

### Issue 1: Option 5 command did not add OSDs (Fixed)
- **What was wrong:** The command `kubectl -n rook-ceph rollout restart deploy/rook-ceph-operator` was presented as the way to add more OSDs. Restarting the Rook operator does not add OSDs — it only restarts the operator pod. Adding OSDs requires new storage devices or nodes and an updated CephCluster custom resource spec.
- **What was changed:** Replaced the operator restart command with instructions to edit the CephCluster resource (`kubectl -n rook-ceph edit cephcluster rook-ceph`) after adding new disks/nodes, and added a monitoring command to watch OSD pod creation.
- **Why:** The original command was misleading and would not achieve the stated goal. Users following it would restart the operator with no effect on OSD count.

### Issue 2: Ambiguous memory calculation (Fixed)
- **What was wrong:** The sentence "With 300 PGs per OSD and 20 OSDs, that is 3 GB of memory just for PG overhead" was ambiguous. The math is 300 × 10 MB = 3 GB per OSD, but the mention of 20 OSDs made it read as though 3 GB was a cluster total (which would actually be 60 GB).
- **What was changed:** Removed the extraneous "and 20 OSDs" and clarified the figure is "3 GB of memory per OSD."
- **Why:** Clarity — the per-OSD vs. cluster-total distinction matters for capacity planning.

## Review Notes
- **`pgp_num` step in Option 2:** The post instructs users to separately set `pgp_num` after reducing `pg_num`. Since PG merging (reducing `pg_num`) was introduced in Ceph Nautilus, and Nautilus also auto-adjusts `pgp_num` to follow `pg_num`, this step is unnecessary in the only Ceph versions where the primary command works. The command is not harmful (it is a no-op if `pgp_num` already matches), but could confuse users into thinking it is required.
- **Memory per PG estimate (10 MB):** The 10 MB per PG figure is on the higher end of community estimates. Commonly cited figures range from 1-5 MiB per PG depending on what is counted (metadata alone vs. including BlueStore cache overhead). The number is not definitively wrong since it varies by workload, but readers should treat it as a conservative upper bound rather than a precise measurement.
- **`ceph osd pool ls detail | sort -k7`:** The `-k7` sort key assumes `pg_num` appears at a fixed column position in the output. The actual column varies depending on pool configuration (e.g., replicated vs. erasure-coded). This command may not sort by PG count in all cases. A more reliable approach would use `--format=json` with `jq`, but the current command is a reasonable approximation.
- **`mon_max_pg_per_osd` default of 250:** Verified correct per Ceph documentation.
- **`ceph osd pool rm` syntax (pool name repeated twice + confirmation flag):** Verified correct.
- **PG autoscaler commands:** All commands verified correct.
- **Target of 100-200 PGs per OSD:** Consistent with Ceph community recommendations.
