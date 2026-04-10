# Validation Summary: How to Automate Ceph Health Monitoring with Custom Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Bash shell scripting
- kubectl CLI
- Python 3 (for JSON parsing)
- Kubernetes CronJob API (batch/v1)
- Slack Webhooks (for alerting)

## Sources Consulted
- Ceph source code (`OSDMonitor.cc`, `PGMap.cc`, `HealthMonitor.cc`) for JSON output field verification
- Ceph CLI documentation for `ceph health`, `ceph osd stat`, `ceph df`, and `ceph pg stat` JSON output formats
- Kubernetes API reference for CronJob spec (batch/v1)

## Issues Found

### 1. OSD Health Monitor — incorrect JSON field name (line 60)
- **What was wrong:** The script accessed `d['num_down_osds']` from the output of `ceph osd stat --format json`. This field does not exist and would cause a Python `KeyError` at runtime. The actual fields are `num_osds`, `num_up_osds`, `num_in_osds`, and `num_remapped_pgs`.
- **What was changed:** Replaced `d['num_down_osds']` with `d['num_osds'] - d['num_up_osds']` to correctly calculate the number of down OSDs.

### 2. PG Consistency Monitor — entirely wrong JSON structure (lines 110-117)
- **What was wrong:** The script referenced `d.get('pg_stats_sum', {}).get('state_stamp', [])` and iterated over entries checking `pg.get('state', '')`. None of these fields (`pg_stats_sum`, `state_stamp`) exist in the output of `ceph pg stat --format json`. The unused variable `pg_states = d.get('pg_summary', {})` also referenced a nonexistent field.
- **What was changed:** Replaced with correct parsing using `d.get('pgs_by_state', [])`, which contains entries with `state_name` (e.g., `"active+clean+inconsistent"`) and `count` fields. Removed the unused `pg_states` variable.

## Review Notes
- The `ceph df` JSON parsing (`stats.total_bytes` and `stats.total_used_raw_bytes`) is correct for modern Ceph (Nautilus and later). Clusters running pre-Nautilus may only have `total_used_bytes` instead of `total_used_raw_bytes`.
- The `ceph health --format json` field `status` is correct for Luminous and later. Very old Ceph versions (pre-Luminous) used `overall_status` instead.
- The CronJob uses `serviceAccountName: rook-ceph-default` which would need appropriate RBAC permissions to exec into the toolbox pod. The post does not cover RBAC setup, which could trip up readers.
- The Basic Health Check Script uses `set -euo pipefail` but the other scripts do not — inconsistent, though not technically wrong.
- Using `bitnami/kubectl:latest` in the CronJob is functional but pinning to a specific version would be better practice for production use.
