# Validation Summary: How to Monitor Multisite Sync Status in Ceph RGW

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway) multisite replication
- radosgw-admin CLI
- Rook (Ceph operator for Kubernetes)
- Prometheus alerting rules
- ceph-mgr Prometheus module
- Bash scripting for monitoring

## Sources Consulted
- Ceph official documentation: radosgw-admin man page (https://docs.ceph.com/en/latest/man/8/radosgw-admin/)
- Ceph Multi-Site documentation (https://docs.ceph.com/en/latest/radosgw/multisite/)
- Ceph Prometheus Module documentation (https://docs.ceph.com/en/latest/mgr/prometheus/)
- Red Hat Ceph Storage 5 Troubleshooting Guide - Multisite sync status (https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/troubleshooting_guide/troubleshooting-a-multisite-ceph-object-gateway)
- Ceph Tracker Feature #52903: Add RGW sync metrics to prometheus (https://tracker.ceph.com/issues/52903)
- Ceph Tracker Feature #23287: sync error trim (https://tracker.ceph.com/issues/23287)

## Issues Found

### 1. Fabricated `radosgw-admin sync status` sample output
**What was wrong:** The sample output showed fields like `behind shards: 0`, `newest full sync`, and `oldest incremental sync` which do not exist in real output. Actual output shows `full sync: 0/128 shards`, `incremental sync: 128/128 shards`, and `data is caught up with source` (or `data is behind on N shards`).
**What was changed:** Replaced the sample output with the real output format from `radosgw-admin sync status` and updated the interpretation note.

### 2. Invalid `radosgw-admin bucket sync markers` subcommand
**What was wrong:** `bucket sync markers` is an undocumented internal/test subcommand not listed in the official radosgw-admin man page. The documented bucket sync subcommands are: `bucket sync checkpoint`, `bucket sync disable`, `bucket sync enable`, and `bucket sync status`.
**What was changed:** Replaced with the documented `radosgw-admin data sync status --source-zone=us-east` command which provides zone-level data sync status.

### 3. Incorrect `--start-time`/`--end-time` flags for sync error commands
**What was wrong:** The `sync error list` and `sync error trim` commands used `--start-time` and `--end-time` flags. The correct flags are `--start-date` and `--end-date` with `yyyy-mm-dd` format.
**What was changed:** Updated flags to `--start-date`/`--end-date` with date-only format.

### 4. Misleading description of `sync error trim`
**What was wrong:** The command was described as "For retry of failed syncs." In reality, `sync error trim` only clears/trims error log entries. It does not retry failed sync operations. Failed syncs are retried automatically by the RGW sync process.
**What was changed:** Updated description to "To clear resolved sync error entries from the log."

### 5. Wrong command for enabling Prometheus metrics
**What was wrong:** `ceph config set client.rgw rgw_enable_ops_log true` enables the S3/Swift operations log (recording API calls), not Prometheus metrics. This is a completely unrelated feature.
**What was changed:** Replaced with `ceph mgr module enable prometheus` which is the correct way to enable the ceph-mgr Prometheus module that exposes Ceph metrics including RGW sync data.

### 6. Fabricated Prometheus metric names
**What was wrong:** The metrics `rgw_sync_seconds_behind`, `rgw_data_sync_status`, and `rgw_metadata_sync_full_total` do not exist in any version of Ceph. Real RGW sync metrics use the `ceph_data_sync_from_<zone>_*` naming convention.
**What was changed:** Replaced with real metric names: `ceph_data_sync_from_<zone>_fetch_bytes_sum`, `ceph_data_sync_from_<zone>_fetch_bytes_count`, `ceph_data_sync_from_<zone>_poll_latency_sum`, `ceph_data_sync_from_<zone>_fetch_errors`.

### 7. Wrong metrics port and endpoint
**What was wrong:** The post stated metrics are scraped from `http://rgw-service:7480/metrics`. Port 7480 is the default RGW S3/Swift API port (civetweb frontend), not the metrics port. RGW sync metrics are exposed by the ceph-mgr daemon on port 9283.
**What was changed:** Updated to `http://ceph-mgr-service:9283/metrics`.

### 8. Broken monitoring script
**What was wrong:** The script used `-it` flags (allocating a TTY) which causes issues when capturing output in a variable. It also grepped for `behind shards` which doesn't appear in real output.
**What was changed:** Removed `-t` flag, updated grep pattern to match real output (`data is behind on N shards`), and added a default value of 0 when sync is caught up.

### 9. Prometheus alert rules using non-existent metrics
**What was wrong:** Alert rules referenced the fabricated metrics `rgw_sync_seconds_behind` and `rgw_data_sync_status`.
**What was changed:** Replaced with alerts using real metrics: `ceph_data_sync_from_us_east_fetch_errors` for error detection and `ceph_data_sync_from_us_east_poll_latency_sum/count` for latency monitoring.

## Review Notes
- Ceph RGW multisite sync metrics in Prometheus remain limited. There is an open feature request (Ceph Tracker #52903) to add better sync state metrics. For comprehensive sync monitoring, parsing `radosgw-admin sync status` output via scripts (as shown in Step 5) remains the most reliable approach.
- The Prometheus alert rules now use zone-specific metric names (hardcoded `us_east`). In production, users will need to adjust the zone name in the metric to match their actual source zone configuration.
- The `bucket sync status` command in Step 2 is correct and useful. The replacement `data sync status` command provides complementary zone-level information.
