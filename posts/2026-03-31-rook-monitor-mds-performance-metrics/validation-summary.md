# Validation Summary: How to Monitor MDS Performance Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph MDS (Metadata Server) for CephFS
- Prometheus (metrics and alerting)
- Kubernetes (kubectl commands)
- Ceph Dashboard

## Sources Consulted
- Ceph Monitoring Documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph Perf Counters Developer Docs: https://docs.ceph.com/en/reef/dev/perf_counters/
- Ceph MGR Prometheus Module: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph MDS Server source (perf counter registration): https://github.com/ceph/ceph/blob/main/src/mds/Server.cc
- Ceph MDSRank source (mds_mem counters): https://github.com/ceph/ceph/blob/main/src/mds/MDSRank.cc
- Rook admin socket issue: https://github.com/rook/rook/issues/3966

## Issues Found

### 1. `ceph daemon` used from rook-ceph-tools pod (lines 43, 52, 120)
**What was wrong:** All `ceph daemon mds.<name>` commands were shown as running from the rook-ceph-tools deployment. `ceph daemon` requires local admin socket access (a Unix domain socket inside the daemon's pod), which is not available from the tools pod.
**What was changed:** Replaced all `ceph daemon` calls with `ceph tell`, which routes commands through the Ceph monitors and works remotely from any pod with Ceph CLI access.

### 2. `ceph mds stat` described as "Detailed MDS performance counters" (line 30)
**What was wrong:** `ceph mds stat` outputs MDS status/state information (e.g., `myfs:1 {0=myfs-a=up:active}`), not performance counters.
**What was changed:** Updated the comment to "MDS daemon status (active/standby)" to accurately describe the command's output.

### 3. Fabricated cache field names (lines 56-58)
**What was wrong:** `cache_lru_size`, `cache_size`, `cap_hits`, and `cap_misses` are not real Ceph MDS perf counter names. The `cache status` admin command was also changed since it's not available via `ceph tell`.
**What was changed:** Replaced with the actual `mds_mem` perf counter fields: `ino` (inodes), `cap` (capabilities), `dn` (dentries), and `rss` (resident memory). Changed the command to `ceph tell mds.<name> perf dump mds_mem`.

### 4. Non-existent Prometheus metric `ceph_mds_server_handle_dentry_link` (line 74)
**What was wrong:** There is no `handle_dentry_link` perf counter registered in the MDS server code. This metric does not exist.
**What was changed:** Removed the row and replaced the metrics table with verified counters: `handle_client_request`, `handle_peer_request`, `mds_mem_ino`, `mds_mem_cap`, and `mds_mem_dn`.

### 5. Outdated metric `ceph_mds_server_handle_slave_request` (line 75)
**What was wrong:** In Ceph Pacific and later (inclusive language initiative), `handle_slave_request` was renamed to `handle_peer_request`.
**What was changed:** Updated to `ceph_mds_server_handle_peer_request`.

### 6. Incorrect Prometheus metric names with extra "cache" (lines 77-78)
**What was wrong:** `ceph_mds_mem_cache_ino` and `ceph_mds_mem_cache_cap` have an extra `cache` segment. The Ceph MGR Prometheus module names metrics as `ceph_<collection>_<counter>`, so `mds_mem.ino` becomes `ceph_mds_mem_ino`.
**What was changed:** Corrected to `ceph_mds_mem_ino` and `ceph_mds_mem_cap`.

### 7. Incorrect latency Prometheus metric names (lines 85, 99)
**What was wrong:** `ceph_mds_request_sum` and `ceph_mds_request_count` do not exist. MDS latency counters are per-operation (e.g., `req_lookup_latency`, `req_create_latency`) under the `mds_server` collection.
**What was changed:** Updated to use `ceph_mds_server_req_lookup_latency_sum` / `ceph_mds_server_req_lookup_latency_count` as a concrete example, and updated the alert rule annotation accordingly.

## Review Notes
- The post does not specify a Ceph version. The fixes target Ceph Quincy/Reef (current maintained releases). Users on older versions (pre-Pacific) may still see `handle_slave_request` instead of `handle_peer_request`.
- The `ceph tell` piped to `python3` command in the bottleneck section assumes the output goes to stdout in a parseable way. In practice, `ceph tell` output may include extra header text; users may need to adjust parsing.
- The Ceph Dashboard section is accurate but generic. The exact dashboard layout varies by Ceph version and whether the dashboard module is enabled.
