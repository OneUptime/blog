# Validation Summary: How to Profile Memory Usage via Admin Socket

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (OSD daemons, BlueStore, admin socket)
- tcmalloc (heap profiling)
- Rook (tagged, though commands are general Ceph admin socket usage)
- Linux /proc filesystem (process memory inspection)
- Python 3 (for JSON parsing of command output)

## Sources Consulted
- Ceph official documentation: Memory Profiling (https://docs.ceph.com/en/latest/rados/troubleshooting/memory-profiling/)
- Ceph source code: `src/common/mempool.cc` and `src/include/mempool.h` for `dump_mempools` output structure
- Ceph source code: `src/perfglue/heap_profiler.cc` for heap command semantics
- Ceph official documentation: BlueStore config reference (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)
- Ceph blog: "Ceph: release RAM used by TCMalloc" (https://ceph.io/en/news/blog/2015/ceph-release-ram-used-by-tcmalloc/)

## Issues Found

### 1. Incorrect JSON path in `dump_mempools` parsing script
- **What was wrong:** The Python script used `data.get('mempool', {})` to iterate over memory pools. The actual `dump_mempools` output nests individual pools under `mempool.by_pool`, so the code was iterating over `{"by_pool": {...}, "total": {...}}` instead of the actual pool entries.
- **What was changed:** Updated to `data.get('mempool', {}).get('by_pool', {})` to correctly access the per-pool breakdown.
- **Why:** Without this fix, the script would not produce any meaningful output since it would iterate over "by_pool" and "total" keys rather than individual pool names like "bluestore_cache_data".

### 2. Incorrect description of `heap release` command
- **What was wrong:** The comment described `ceph daemon osd.0 heap release` as "Trigger garbage collection". Ceph is written in C++ and has no garbage collector. The command tells tcmalloc to release its internal free memory (cached but unused allocations) back to the operating system via `madvise()`.
- **What was changed:** Updated comment from "Trigger garbage collection" to "Release free memory back to the OS".
- **Why:** The original description was technically inaccurate and could mislead readers about what the command does.

## Review Notes
- The post is tagged "Rook" but the "Checking Total Process Memory" section uses `systemctl show ceph-osd@N` commands, which only work for host-level systemd-managed Ceph deployments. In Rook/Kubernetes environments, you would need to `kubectl exec` into the OSD pod and inspect `/proc/1/status` or use `kubectl top pod`. The admin socket commands themselves work the same way in both environments. This is not incorrect per se (the commands are valid for non-Rook Ceph), but readers using Rook specifically would need to adapt this section.
- The `bluestore_cache_size_hdd` default is 1 GiB and `bluestore_cache_size_ssd` default is 3 GiB, which matches the values used in the "Reducing Memory Usage" section. The post is effectively setting these to their defaults, which may not actually reduce memory. This could be clarified but is not technically wrong since the intent is to provide example values.
- The `heap dump` command only produces output when tcmalloc's heap profiler is running (started via `heap start_profiler`). The post does not mention this prerequisite, which could confuse readers who expect output from `heap dump` without first enabling the profiler.
- All five listed mempool names (`osd`, `buffer_anon`, `bluefs`, `bluestore_cache_data`, `bluestore_cache_onode`) are verified correct against the Ceph source code.
- All configuration options mentioned (`bluestore_cache_size`, `bluestore_cache_size_hdd`, `bluestore_cache_size_ssd`, `osd_op_num_threads_per_shard`) are valid Ceph configuration parameters.
