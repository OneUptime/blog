# Validation Summary: How to Monitor D3N Cache Hit Rates in Ceph RGW

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- D3N Datacache
- D4N Datacache (successor to D3N)
- Ceph Admin Socket / perf dump
- Prometheus
- Grafana / PromQL
- Python
- journalctl / systemd

## Sources Consulted
- Ceph RGW perf counter source code: https://github.com/ceph/ceph/blob/main/src/rgw/rgw_perf_counters.cc (via Fossies mirror)
- Ceph D3N datacache source: https://github.com/ceph/ceph/blob/main/src/rgw/driver/rados/rgw_d3n_datacache.h
- Ceph D3N documentation: https://docs.ceph.com/en/reef/radosgw/d3n_datacache/
- Ceph perf counters documentation: https://docs.ceph.com/en/octopus/dev/perf_counters/ and https://docs.huihoo.com/ceph/v9.0.0/dev/perf_counters/index.html
- Ceph Prometheus module docs: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph perf reset blog: https://ceph.io/en/news/blog/2015/ceph-reset-perf-counter/

## Issues Found

1. **Non-existent D3N perf counter names**: The post referenced `d3n_cache_hit`, `d3n_cache_miss`, `d3n_cache_eviction`, and `d3n_cache_write` as perf counters. These do not exist in Ceph. The D3N datacache implementation does not register its own PerfCounters. The actual RGW cache counters are `cache_hit` and `cache_miss` (general RGW metadata cache). In Ceph Reef+ with D4N enabled, dedicated datacache counters exist: `d4n_cache_hits`, `d4n_cache_misses`, `d4n_cache_evictions`. Fixed all counter names to the real ones and added clarification about D3N vs D4N counters.

2. **Incorrect perf dump JSON parsing**: The Python script used `.get('d3n_cache_hit', {}).get('val', 0)` to extract counter values. Ceph perf dump outputs simple counters (u64) as plain integers, not as objects with a `val` field. Only average/time-based counters use a dict format (with `avgcount` and `sum` fields). Fixed to use `.get('cache_hit', 0)` directly.

3. **Non-existent Prometheus metric names**: The PromQL queries used `ceph_rgw_d3n_cache_hit` and `ceph_rgw_d3n_cache_miss`, which don't exist. Corrected to `ceph_rgw_cache_hit` and `ceph_rgw_cache_miss` which are the actual Prometheus metrics exported by the Ceph MGR Prometheus module.

4. **Incorrect Prometheus endpoint grep pattern**: The `grep d3n` filter on the metrics endpoint would match nothing. Changed to `grep ceph_rgw_cache` to find the actual cache metrics.

5. **Wrong RGW log grep patterns**: The post used `grep -c "cache hit"` and `grep -c "cache miss"`, but D3N logs cache operations through the `rgw_datacache` debug subsystem with messages containing "d3n" and phrases like "READ FROM CACHE" / "WRITE TO CACHE". Fixed grep patterns and added the debug configuration command (`debug_rgw_datacache`).

6. **Invalid `perf reset` syntax**: The command `perf reset all` used an undocumented `all` argument. The correct syntax is simply `perf reset` with no arguments.

## Review Notes
- D3N is a legacy datacache feature that lacks dedicated perf counters. D4N is its successor with proper instrumentation. Users running newer Ceph versions (Reef+) should consider D4N for better monitoring support.
- The `ceph mgr dump` field `active_addr` format may vary across Ceph versions; in msgr2-only deployments the `active_addrs` field may be more reliable, but `active_addr` is broadly compatible.
- The PromQL hit-rate query has a potential division-by-zero when both rates are zero. A production dashboard should add a safeguard (e.g., wrapping with `clamp_min` on the denominator or using `or vector(0)`).
- In Rook/Kubernetes deployments, `journalctl` and `ceph daemon` commands need to be run inside the appropriate RGW pods (e.g., via `kubectl exec`).
