# Validation Summary: How to Handle PGs Stuck in backfill_toofull+peered State

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Ceph Placement Groups (PGs)
- Ceph OSD management
- Ceph CRUSH map and balancer module
- Kubernetes CRDs (CephCluster)

## Sources Consulted
- Ceph Monitor Config Reference: https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph Health Checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph Monitoring OSDs and PGs: https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Ceph Balancer Module documentation: https://docs.ceph.com/en/latest/rados/operations/balancer/
- Ceph upmap documentation: https://docs.ceph.com/en/latest/rados/operations/upmap/
- Ceph Blog — Difference Between ceph osd reweight and ceph osd crush reweight: https://ceph.io/en/news/blog/2014/difference-between-ceph-osd-reweight-and-ceph-osd-crush-reweight/
- Red Hat Ceph Storage CRUSH Weights: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/1.2.3/html/storage_strategies/crush-weights
- Red Hat OpenShift Data Foundation — Setting Ceph OSD full thresholds: https://docs.redhat.com/en/documentation/red_hat_openshift_data_foundation/4.17/html/managing_and_allocating_storage_resources/setting-ceph-osd-full-thresholds__rhodf
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph Monitoring a Cluster: https://docs.ceph.com/en/latest/rados/operations/monitoring/

## Issues Found

### Issue 1: Incorrect command for setting backfillfull ratio
- **What was wrong:** The post used `ceph config set global osd_backfillfull_ratio 0.95` and `ceph config set global osd_backfillfull_ratio 0.90` to temporarily adjust and restore the backfillfull threshold. The backfillfull ratio is stored in the OSDMap, not in the central config store. Using `ceph config set global` sets the value in the config database but the actual runtime value used by OSDs comes from the OSDMap.
- **What was changed:** Replaced both instances with `ceph osd set-backfillfull-ratio 0.95` and `ceph osd set-backfillfull-ratio 0.90`, which correctly modifies the OSDMap value at runtime.
- **Why:** The `mon_osd_backfillfull_ratio` config key only seeds the OSDMap value at cluster creation time. After that, changes must be made via `ceph osd set-backfillfull-ratio` to take effect immediately.

### Issue 2: Wrong awk column number for PG state
- **What was wrong:** The verification command used `awk '{print $1, $15}'` claiming column 15 contains the PG state in `ceph pg dump pgs` output.
- **What was changed:** Changed `$15` to `$13`, which is the correct STATE column in modern Ceph versions (Quincy/Reef).
- **Why:** In current Ceph releases, the `ceph pg dump pgs` output has STATE at column 13. Column 15 corresponds to VERSION, not STATE.

## Review Notes
- The awk column number for PG state has varied across Ceph versions as new columns were added over time. Readers on older Ceph versions may need to verify the column position by checking the header row of `ceph pg dump pgs` output. A more version-resilient approach would be to use `ceph pg dump pgs --format json | jq` for parsing.
- The post uses both `ceph osd reweight` and `ceph osd crush reweight` but does not explain the difference between them. `ceph osd reweight` sets a temporary weight (0-1 range, non-persistent across OSD restarts) while `ceph osd crush reweight` modifies the persistent CRUSH weight (value in TB). Both are used correctly for their intended purposes, but a brief note explaining the distinction would benefit readers.
- The `ceph pg <pgid> query` command has been reported to produce JSON parse errors in some newer Ceph deployments, though it remains a valid command.
