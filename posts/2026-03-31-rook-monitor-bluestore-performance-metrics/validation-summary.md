# Validation Summary: How to Monitor BlueStore Performance Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (BlueStore object store backend)
- Ceph admin socket (`ceph daemon` perf dump)
- Prometheus (Ceph mgr module)
- Grafana dashboards
- Rook (Kubernetes Ceph operator)
- RocksDB (BlueStore metadata engine)
- Python 3 (scripting for metric extraction)
- Bash scripting

## Sources Consulted
- Ceph BlueStore source code (BlueStore.cc, BlueStore.h) — https://github.com/ceph/ceph/blob/main/src/os/bluestore/BlueStore.cc
- Ceph OSD perf counters source — https://github.com/ceph/ceph/blob/main/src/osd/osd_perf_counters.cc
- Ceph PerfCounters header — https://github.com/ceph/ceph/blob/main/src/common/perf_counters.h
- Ceph Prometheus module source — https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py
- Ceph perf counters documentation — https://docs.ceph.com/en/latest/dev/perf_counters/
- Grafana Dashboard 2842 — https://grafana.com/grafana/dashboards/2842-ceph-cluster/
- Rook monitoring examples — https://github.com/rook/rook/tree/master/deploy/examples/monitoring

## Issues Found

### 1. Incorrect perf counter names (prefixed with `bluestore_`)
**What was wrong:** All counter names in the Write Metrics and Cache Metrics sections used a `bluestore_` prefix (e.g., `bluestore_write_big`, `bluestore_cache_hits`). In Ceph's `perf dump`, counters within the `"bluestore"` collection use short names without the collection prefix (e.g., `write_big`, `onode_hits`).
**What was changed:** Removed the `bluestore_` prefix from all perf dump counter references.

### 2. Fabricated counter names
**What was wrong:** Several counter names do not exist in Ceph's BlueStore:
- `bluestore_write_deferred` — does not exist. Real counters: `write_big_deferred`, `issued_deferred_writes`, `issued_deferred_write_bytes`.
- `bluestore_cache_hits` / `bluestore_cache_misses` — do not exist. Real counters: `onode_hits`, `onode_misses` (for onode cache), `buffer_hit_bytes`, `buffer_miss_bytes` (for buffer cache).
- `bluestore_cache_bytes` — does not exist. Real counter: `buffer_bytes`.
- `bluestore_cache_trim_max_skip_pinned` — does not exist in the source code.
**What was changed:** Replaced all fabricated names with correct counter names from the Ceph source code.

### 3. Wrong data type handling in the "Collecting Metrics for All OSDs" script
**What was wrong:** The Python code called `.get('avgcount', 0)` on cache hit/miss and deferred write counters, treating them as complex objects with `avgcount`/`sum` fields. These counters are registered with `add_u64_counter()` in Ceph, meaning they are simple integers in `perf dump` output. Calling `.get()` on an integer raises `AttributeError`.
**What was changed:** Replaced `.get('avgcount', 0)` calls with direct integer access for simple counters. Added `isinstance` checks for the `op_w_latency` complex counter to be defensive.

### 4. Incorrect Prometheus metric names for cache ratio
**What was wrong:** The PromQL used `ceph_bluestore_cache_hits` and `ceph_bluestore_cache_misses`, which don't exist because the underlying perf counters don't exist.
**What was changed:** Replaced with `ceph_bluestore_onode_hits` and `ceph_bluestore_onode_misses`, and wrapped in `rate()` since these are monotonically increasing counters.

### 5. Missing shell variable quoting
**What was wrong:** `echo $DATA` was unquoted, risking word splitting and glob expansion of the JSON content.
**What was changed:** Changed to `echo "$DATA"`.

### 6. Inaccurate code comment
**What was wrong:** `bluestore_write_small` was described as "Small writes via WAL". BlueStore doesn't use a WAL in the FileStore sense; small writes are those below `min_alloc_size`.
**What was changed:** Updated comment to "Small writes (below min_alloc_size)".

## Review Notes
- Grafana dashboard ID `2842` is a valid Ceph cluster overview dashboard, but it is not specifically a BlueStore performance dashboard. The claim that it "includes BlueStore panels" is somewhat overstated — it provides cluster-level metrics.
- The Rook URL (`master` branch, `deploy/examples/monitoring/service-monitor.yaml`) was verified as correct.
- The `ceph daemon osd.N perf dump` command only works on the host running that OSD with admin socket access. In a Rook/Kubernetes deployment (implied by the post's directory name), users would need to `kubectl exec` into the OSD pod first. The post doesn't mention this.
- The `osd` variable name in the "Collecting Metrics" script was renamed to `osd_data` to avoid shadowing the shell variable concept and improve clarity.
