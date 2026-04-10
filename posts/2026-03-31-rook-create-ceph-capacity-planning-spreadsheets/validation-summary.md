# Validation Summary: How to Create Ceph Capacity Planning Spreadsheets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- kubectl (Kubernetes CLI)
- jq (JSON processor)
- Bash scripting
- Kubernetes CronJobs

## Sources Consulted
- Ceph official documentation for `ceph df`, `ceph osd df` commands and their JSON output formats (https://docs.ceph.com/en/latest/rados/operations/monitoring/)
- Ceph source code (GitHub ceph/ceph) for JSON output field names in `ceph df --format json`, `ceph df detail --format json`, and `ceph osd df --format json`
- Ceph PR #25190 confirming `total_used_raw_bytes` field in `ceph df` stats
- Ceph erasure coding documentation (https://docs.ceph.com/en/latest/rados/operations/erasure-code/)
- Rook toolbox documentation (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found
1. **CronJob script uses `-it` flag (line 89)**: The "Track Growth Over Time" section describes running a script "daily via a CronJob" but the `kubectl exec` command used `-it` (interactive TTY). CronJobs run non-interactively with no TTY attached, so the `-t` flag would cause the command to fail with "unable to use a TTY - input is not a terminal". Removed `-it` from the `kubectl exec` command in the CronJob script, changing it to `kubectl -n rook-ceph exec deploy/rook-ceph-tools --`.

## Review Notes
- The capacity calculation formulas for both replicated and erasure-coded pools are correct.
- All `ceph df` and `ceph osd df` JSON field names (`total_bytes`, `total_used_raw_bytes`, `bytes_used`, `max_avail`, `name`, `kb`, `kb_used`, `utilization`) were verified against the Ceph source code and are accurate.
- The post uses 80% (warning) and 85% (critical) as planning thresholds. These are reasonable proactive planning targets. Note that Ceph's own built-in defaults are `nearfull_ratio` = 0.85 (85%) and `full_ratio` = 0.95 (95%), so the author's thresholds are appropriately more conservative for capacity planning purposes.
- The other `kubectl exec -it` usages (in the interactive data-gathering commands) are correct since those are intended for manual execution.
