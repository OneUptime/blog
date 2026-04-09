# Validation Summary: How to Monitor RGW Multisite Replication Bandwidth

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph multisite replication
- ceph-mgr Dashboard
- Prometheus and Grafana
- Linux traffic control (tc)
- iftop / network monitoring tools
- Kubernetes (Rook context)

## Sources Consulted
- Ceph Admin Operations REST API documentation: https://docs.ceph.com/en/latest/radosgw/adminops/
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph Perf Counters documentation: https://docs.ceph.com/en/reef/dev/perf_counters/
- Ceph RGW Metrics documentation: https://docs.ceph.com/en/latest/radosgw/metrics/
- Ceph Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph Object Gateway Config Reference: https://docs.ceph.com/en/reef/radosgw/config-ref/
- Ceph source: rgw.yaml.in config option definitions: https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in
- Ceph PR #26722 (data sync perf counters): https://github.com/ceph/ceph/pull/26722
- Ceph PR #27725 (sync counter naming fix): https://github.com/ceph/ceph/pull/27725

## Issues Found

### 1. Fabricated RGW Admin REST API endpoint
**What was wrong:** The post used `curl -s "http://localhost:7480/admin/performance?pretty=1&categories=rgw,rgw_data_sync"` — the `/admin/performance` endpoint does not exist in the RGW Admin Operations REST API.
**What was changed:** Replaced with the correct admin socket approach: `ceph daemon /var/run/ceph/ceph-client.rgw.*.asok perf dump` and `ceph tell rgw.<instance-id> perf dump`.
**Why:** Perf counters are accessed via the Ceph admin socket or `ceph tell`, not via the HTTP admin API.

### 2. Invalid `radosgw-admin perf dump` command
**What was wrong:** `radosgw-admin perf dump` is not a valid subcommand. `radosgw-admin` supports commands like `sync status`, `data sync status`, `user info`, etc., but not `perf dump`.
**What was changed:** Replaced with `ceph tell rgw.<instance-id> perf dump` as the alternative command.
**Why:** Perf counter dumps are an admin socket operation, not a `radosgw-admin` subcommand.

### 3. Incorrect perf counter names
**What was wrong:** The post referenced `rgw_data_sync_fetch` and `rgw_data_sync_fetch_bytes` as top-level counter names. The actual counters are nested under `data-sync-from-<zone>` sections with names like `fetch`, `fetch_bytes`, `poll_latency`, and `fetch_errors`.
**What was changed:** Updated the description to reference the correct section structure and counter names.
**Why:** Users looking for these fabricated counter names in actual perf dump output would not find them.

### 4. Fabricated Prometheus metric names
**What was wrong:** `ceph_rgw_bytes_received` and `ceph_rgw_data_sync_fetch_latency` are not real Ceph Prometheus metrics. The actual RGW byte metrics are `ceph_rgw_get_b` and `ceph_rgw_put_b`.
**What was changed:** Replaced with `rate(ceph_rgw_put_b[5m])` and `rate(ceph_rgw_get_b[5m])` with comments explaining their relevance to sync monitoring.
**Why:** Using non-existent metric names would cause Grafana queries to return no data.

### 5. Flawed Python bandwidth tracking script
**What was wrong:** The script used `radosgw-admin perf dump` (invalid command) and had incorrect JSON parsing logic. It iterated top-level keys checking `'sync' in k and 'bytes' in k`, but `'bytes'` only appears in nested counter names, not in top-level section names like `data-sync-from-<zone>`.
**What was changed:** Fixed the command to use `ceph daemon` and updated the Python logic to iterate into nested sections: checking `'sync' in section` at the top level, then `'bytes' in name` within each section's counters.
**Why:** The original script would never match any keys and would produce empty output.

### 6. Misleading `rgw_sync_lease_period` as bandwidth control
**What was wrong:** The post presented `rgw_sync_lease_period` as a bandwidth-limiting config option. This option controls the duration of sync lease locks (a coordination mechanism), not bandwidth. Its default is 120 seconds.
**What was changed:** Removed the `rgw_sync_lease_period` line from the bandwidth limiting section, keeping only `rgw_data_sync_concurrency` with an updated comment clarifying it reduces parallelism to indirectly limit bandwidth.
**Why:** Setting this option would not limit bandwidth and could cause sync coordination issues if misconfigured.

## Review Notes
- The `rgw_data_sync_concurrency` option controls per-shard sync parallelism and can indirectly reduce bandwidth, but it does not provide a precise bandwidth cap. The `tc` traffic shaping approach shown is the only way to enforce an exact bandwidth limit.
- The `tc qdisc` command shown applies to ALL traffic on the interface, not just RGW sync traffic. For targeted shaping, `tc` filters with classifiers would be needed. This is not technically wrong but could be misleading in environments with mixed traffic.
- The Prometheus metrics `ceph_rgw_get_b` and `ceph_rgw_put_b` are aggregate metrics for all RGW operations, not sync-specific. They serve as a reasonable proxy for sync bandwidth on dedicated secondary zones but may include non-sync traffic on zones handling client requests.
- The `ceph mgr module enable dashboard` and `ceph mgr module enable prometheus` commands are correct.
- The iftop command syntax and the periodic monitoring script (ss/netstat) are correct.
