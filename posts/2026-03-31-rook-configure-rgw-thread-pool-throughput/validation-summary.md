# Validation Summary: How to Configure RGW Thread Pool for Optimal Throughput

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RADOS Gateway (RGW)
- Ceph Beast HTTP frontend
- Kubernetes (kubectl)
- Prometheus (monitoring)

## Sources Consulted
- [Ceph Object Gateway Config Reference (Reef)](https://docs.ceph.com/en/reef/radosgw/config-ref/) — verified `rgw_thread_pool_size` default of 512 and beast frontend configuration
- [Ceph HTTP Frontends Documentation (Pacific)](https://docs.ceph.com/en/pacific/radosgw/frontends/) — verified beast frontend options (`num_threads`, `request_timeout_ms`)
- [Ceph PR #27684: Remove rgw_num_rados_handles](https://github.com/ceph/ceph/pull/27684) — confirmed `rgw_num_rados_handles` was removed in Nautilus (merged Aug 2019)
- [Ceph Bug #48358: qlen and qactive perf counters leak](https://tracker.ceph.com/issues/48358) — confirmed `ceph_rgw_qlen` is a real Prometheus metric
- [Red Hat Ceph Storage RGW deployment strategies and sizing guidance](https://www.redhat.com/en/blog/red-hat-ceph-storage-rgw-deployment-strategies-and-sizing-guidance) — verified thread pool sizing and memory consumption patterns
- [Ceph Perf Counters Documentation (Reef)](https://docs.ceph.com/en/reef/dev/perf_counters/) — verified `ceph tell` perf dump syntax

## Issues Found

### 1. Removed deprecated `rgw_num_rados_handles` option
**What was wrong:** The "Small object, high IOPS" section recommended setting `rgw_num_rados_handles` to 32. This configuration option was removed from Ceph in the Nautilus release (PR #27684, merged August 2019). Since Rook deploys modern Ceph versions (Quincy, Reef, or Squid), this option either fails with an unknown-option error or is silently ignored.
**What was changed:** Removed the `ceph config set client.rgw rgw_num_rados_handles 32` command from the code block.
**Why:** Recommending a non-existent config option is misleading and would cause errors or confusion for readers.

### 2. Fixed `ceph tell` command missing daemon instance suffix
**What was wrong:** The monitoring section used `ceph tell client.rgw.my-store perf dump`, but `ceph tell` requires a specific daemon instance ID. `client.rgw.my-store` is a config section prefix, not a daemon instance name.
**What was changed:** Changed to `ceph tell client.rgw.my-store.a perf dump` to target a specific daemon instance.
**Why:** Without the instance suffix (e.g., `.a`), the `ceph tell` command will fail because it cannot resolve to a specific daemon.

### 3. Corrected per-thread memory estimate
**What was wrong:** The post claimed "Each thread consumes approximately 10-20 MB of stack memory. 1024 threads = approximately 10-20 GB memory required." The default Linux thread stack size is 8 MB, and the commonly cited formula for RGW memory is `thread_count * 8MB + base_overhead`.
**What was changed:** Corrected to "approximately 8 MB of stack memory (the default Linux thread stack size). 1024 threads = approximately 8 GB of stack memory required, plus additional heap overhead per connection."
**Why:** The original 10-20 MB figure overestimates per-thread stack memory and could lead readers to over-provision resources.

## Review Notes
- The `num_threads` parameter in `rgw_frontends` will overwrite `rgw_thread_pool_size` if both are set. In the "Large object" example, both are set to 256, which is consistent but readers should be aware of this interaction. When using the beast frontend, it is generally recommended to set only `rgw_thread_pool_size` and omit `num_threads` from `rgw_frontends` to avoid confusion.
- The `ceph_rgw_qlen` Prometheus metric has had reliability issues in some Ceph versions (Bug #48358 — qlen counter leak), fixed in v20.2.0. Readers on older versions should be aware that this metric may not accurately reflect actual queue depth.
- The `throttle-rgw_ops` perf counter key in the `perf dump` output could not be fully verified against current Ceph versions. Readers should check their actual `perf dump` output to confirm the correct key name.
- The CPU multiplier rules of thumb (CPU_cores * 50 for I/O-bound, CPU_cores * 10 for CPU-bound) are the author's recommendations rather than official Ceph guidance. Red Hat's sizing guidance suggests that 512 threads with 4 CPU cores delivers optimal performance, which aligns more closely with a ~128x multiplier for that specific scenario.
