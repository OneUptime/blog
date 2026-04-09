# Validation Summary: How to Monitor Sync Module Status and Lag

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- radosgw-admin CLI
- Prometheus (scrape config and alerting rules)
- Grafana (alerting/dashboarding)
- Bash scripting
- crontab

## Sources Consulted
- Ceph radosgw-admin man page (doc/man/8/radosgw-admin.rst) — https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph radosgw-admin help text (src/test/cli/radosgw-admin/help.t) — https://github.com/ceph/ceph/blob/main/src/test/cli/radosgw-admin/help.t
- Ceph RGW data sync perf counters (PR #27921) — https://github.com/ceph/ceph/pull/27921
- Ceph Tracker #52903 (request for higher-level sync metrics) — https://tracker.ceph.com/issues/52903
- Prometheus alerting rules documentation — https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Grafana file provisioning documentation — https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- ceph-users mailing list discussions on sync status output format

## Issues Found

1. **`radosgw-admin data sync status` piped to `jq` (Step 2)**: The command outputs human-readable text, not JSON. Removed the `jq` pipe and added a comment clarifying the output format is text.

2. **`radosgw-admin datalog status --source-zone=primary-zone` (Step 2)**: The `datalog status` subcommand reads the local data log and does not accept a `--source-zone` flag. That flag belongs to `data sync status`. Removed `--source-zone` from the command.

3. **Fabricated Prometheus metric names (Step 3)**: The metric names `rgw_sync_full_sync_index_count`, `rgw_sync_inc_sync_index_count`, and `rgw_sync_error_count` do not exist in Ceph. Replaced with real Ceph MGR Prometheus module metrics: `ceph_data_sync_from_<zone>_fetch_bytes_sum`, `ceph_data_sync_from_<zone>_fetch_errors`, and `ceph_data_sync_from_<zone>_poll_latency_sum`. Updated the grep pattern and scrape config regex accordingly.

4. **Invalid hybrid alert rules format (Step 4)**: The YAML had `apiVersion: 1` (a Grafana provisioning field) combined with Prometheus-style alert rule syntax (`alert`, `expr`, `for`, `labels`, `annotations`). This hybrid would not work in either system. Removed `apiVersion: 1`, corrected the comment from "Grafana alert rule" to "Prometheus alerting rules", and updated alert expressions to use real Ceph metric names.

5. **`radosgw-admin sync error trim --start-time` (Step 5)**: The `--start-time` flag does not exist. The correct flag is `--end-date` with format `yyyy-mm-dd`. Changed to `--end-date=$(date -d '7 days ago' +%Y-%m-%d)`.

6. **Crontab overwrite (Step 6)**: `echo "..." | crontab -` overwrites the entire crontab, destroying all existing entries. Fixed to preserve existing entries using `(crontab -l 2>/dev/null; echo "...") | crontab -`.

## Review Notes
- Ceph Tracker #52903 is an open feature request to add higher-level sync state metrics (like objects behind, sync index counts) to Prometheus. If/when that lands, the monitoring approach in Step 3 could be updated with more granular sync lag metrics.
- The `date -d '7 days ago'` syntax in Step 5 is GNU date-specific and will not work on macOS/BSD. This is acceptable since Ceph clusters typically run on Linux.
- The alert rule in Step 4 uses `primary_zone` as a hardcoded zone name in the metric. In practice, the zone name in the metric label will match the actual Ceph zone configuration and may need adjustment.
