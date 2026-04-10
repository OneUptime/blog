# Validation Summary: How to Configure Ceph for Large (100+ Node) Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Ceph Monitors, Managers, OSDs
- CRUSH map hierarchy
- PG Autoscaler
- Kubernetes Deployments

## Sources Consulted
- Ceph official documentation: placement group autoscaling (https://docs.ceph.com/en/latest/rados/operations/placement-groups/)
- Ceph configuration reference for monitor options (`mon_min_osdmap_epochs`, `mon_max_osdmap_epochs`)
- Ceph Manager module documentation (`mgr_stats_period`)
- Ceph CRUSH map documentation (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Rook operator environment variables documentation (https://rook.io/docs/rook/latest-release/Getting-Started/operator-config/)
- Ceph health check codes documentation (`SLOW_OPS` health check)
- `ceph osd df` output format across Ceph versions (Quincy/Reef)

## Issues Found

1. **Incorrect comment on `mgr_stats_period` (line 99)**: The comment said "Adjust MGR module thread count for large clusters" but `mgr_stats_period` controls the stats collection interval (in seconds), not thread count. Changed to "Adjust stats collection interval for large clusters."

2. **Wrong grep pattern for slow operations (line 115)**: `grep "slow requests"` was used, but modern Ceph (Luminous and later) uses the health check code `SLOW_OPS` with message text "slow ops", not "slow requests". The term "slow requests" was used in pre-Luminous Ceph. Changed to `grep "slow ops"`.

3. **Wrong column in `ceph osd df` awk command (lines 117-118)**: `awk 'NR>1 {print $2}'` extracts column 2, which is the CLASS column (e.g., "hdd", "ssd"), not PG counts. The PGS column is approximately column 13 in modern Ceph, but varies by version. Replaced with `ceph osd df tree` which provides a clear hierarchical view with a visible PGS column.

4. **Wrong sort column for PG verification (lines 119-120)**: `sort -k2 -n` sorted by the CLASS column, not PGs. Replaced with a `jq`-based JSON parsing command that reliably extracts PG counts regardless of column position: `ceph osd df -f json | jq -r '[.nodes[] | select(.type == "osd")] | sort_by(-.pgs)[:10][] | "osd.\(.id): \(.pgs) PGs"'`.

5. **Invalid Rook operator environment variable (line 88)**: `ROOK_OPERATOR_TIMEOUT` is not a recognized Rook operator environment variable. Changed to `ROOK_CEPH_COMMANDS_TIMEOUT_SECONDS` (with value "300" for 5 minutes), which is the actual Rook env var that controls the timeout for Ceph CLI commands executed by the operator — important for large clusters where commands may take longer.

## Review Notes
- The `mon_max_osdmap_epochs` option referenced in the "Limit Monitor Map History" section is valid but may behave differently in newer Ceph versions (Reef+) where the OSD map pruning system has been reworked around `mon_osdmap_full_prune_min` and `mon_osdmap_full_prune_interval`. The blog post's recommendations are still functional but readers targeting Reef+ should verify against their specific version's documentation.
- The Rook operator section title says "Limit Rook Operator Reconciliation Rate" but the shown env vars (`ROOK_CEPH_COMMANDS_TIMEOUT_SECONDS` and `ROOK_LOG_LEVEL`) control command timeout and log verbosity, not reconciliation rate specifically. For actual reconciliation concurrency control, `ROOK_RECONCILE_CONCURRENT_CLUSTERS` would be more relevant. The section is still useful general advice for large cluster operator configuration.
- The `mon_target_pg_per_osd` value of 100 matches the default. For very large clusters, some administrators use 128 or 200. The blog's value is reasonable and safe.
- The `jq` tool is assumed to be available for the JSON-based PG verification command. This is standard on most Ceph/Kubernetes admin environments but could be noted as a dependency.
