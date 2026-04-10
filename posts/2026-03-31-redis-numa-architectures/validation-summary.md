# Validation Summary: How to Use Redis on NUMA Architectures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (server configuration, persistence, jemalloc allocator)
- Linux NUMA tools (numactl, numastat, lscpu)
- Linux kernel tuning (NUMA balancing, Transparent Huge Pages)
- Linux sysctl configuration

## Sources Consulted
- Redis official documentation for `jemalloc-bg-thread`, `dynamic-hz`, `hz`, and `save` directives (https://redis.io/docs/latest/operate/oss_and_stack/management/config/)
- numactl man page for `--cpunodebind` and `--membind` flags
- Linux kernel documentation for `/proc/sys/kernel/numa_balancing` and Transparent Huge Pages
- Redis latency documentation on THP (https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/)

## Issues Found
1. **Incorrect jemalloc comment on `dynamic-hz`**: The redis.conf section had a comment stating that `dynamic-hz no` and `hz 10` disable jemalloc background threads. This is wrong. `dynamic-hz` controls whether Redis dynamically adjusts its internal timer frequency, and `hz` sets the base frequency for background tasks (expired key checks, etc.). The correct directive to disable jemalloc background threads is `jemalloc-bg-thread no` (available since Redis 6.0). **Fix**: Added `jemalloc-bg-thread no` with the jemalloc comment, and moved `dynamic-hz`/`hz` under a separate accurate comment about keeping background task frequency predictable.

2. **Misleading comment on `save ""`**: The comment said "Use fewer background save forks" but `save ""` doesn't reduce forks — it eliminates automatic RDB saves entirely. **Fix**: Changed comment to "Disable automatic RDB saves (fork copy-on-write can spread pages across nodes)" for accuracy.

## Review Notes
- The claim that remote NUMA access is "20-40% slower" is a reasonable general estimate, though actual penalties vary by hardware and can exceed this range on some architectures. Acceptable as a general guideline.
- The THP section states THP causes NUMA page migration. While THP does interact with NUMA (larger pages are costlier to migrate, and khugepaged can place merged pages on remote nodes), the primary reason Redis recommends disabling THP is latency spikes from memory compaction and excessive COW memory usage during fork. The advice is correct but the reasoning is incomplete.
- The `numastat -p` output example is simplified (missing Private and Total rows) but adequate for illustration.
- All numactl commands, flags, and sysctl paths are correct.
- The NUMA distance values (10 local, 21 remote) in the example output are realistic SLIT table values.
