# Validation Summary: How to Monitor Multisite Sync Lag for DR Readiness

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway) multisite replication
- `radosgw-admin` CLI
- AWS CLI (S3-compatible commands against RGW endpoints)
- Ceph MGR Prometheus module
- Prometheus alerting rules (YAML)
- Bash scripting

## Sources Consulted
- Ceph official documentation on RGW multisite sync: https://docs.ceph.com/en/latest/radosgw/multisite/
- Ceph `radosgw-admin` CLI reference: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph MGR Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- AWS CLI `s3` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
1. **Bug in automated monitoring script (lines 127-131)**: The script used `sort | head -1` to select the **oldest** probe object on the secondary zone, then computed lag as `now - oldest_probe_timestamp`. This is incorrect because the oldest probe is the first one that ever replicated — not an indicator of current sync lag. Over time, the computed "lag" would grow indefinitely regardless of actual sync state. **Fix**: Changed `head -1` to `tail -1` and renamed `OLDEST_PROBE` to `NEWEST_PROBE`. The newest probe on the secondary represents the most recently replicated data, so `now - newest_probe_timestamp` correctly approximates the current sync lag.

## Review Notes
- The Prometheus metric names `ceph_rgw_data_sync_num_shards_behind` and `ceph_rgw_metadata_sync_num_shards_behind` may not be standard built-in Ceph MGR prometheus metrics in all versions. Readers should run the `grep` command shown in the post to discover the actual metric names available in their Ceph deployment, as names vary across Ceph releases.
- The `ceph mgr dump | python3 -c "..."` approach for extracting the MGR active address is fragile — in Ceph versions using messenger v2, the `active_addr` field format may include a `v2:` prefix that would break the `split(':')[0]` parsing. Readers running newer Ceph clusters should verify the field format.
- The automated monitoring script does not clean up old probe objects, so the `sync-monitor` bucket will grow without bound. In production, a cleanup step should be added to remove probes older than a retention window.
- The probe-based lag measurement in the "Measuring Lag in Seconds" section has an inherent accuracy of +-5 seconds due to the polling interval, which is acceptable for most DR monitoring use cases.
