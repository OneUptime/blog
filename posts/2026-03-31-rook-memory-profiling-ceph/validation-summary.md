# Validation Summary: How to Perform Memory Profiling in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (OSD, MON daemons)
- Rook (Ceph operator for Kubernetes)
- tcmalloc / gperftools (heap profiling)
- google-pprof (heap profile analysis)
- Ceph admin socket
- Ceph MGR Prometheus module
- BlueStore cache autotuning

## Sources Consulted
- gperftools pprof documentation and source code: https://github.com/gperftools/gperftools
- Ubuntu manpage for google-pprof: https://manpages.ubuntu.com/manpages/bionic/man1/google-pprof.1.html
- gperftools Heap Profiler documentation: https://gperftools.github.io/gperftools/heapprofile.html
- Ceph mempool documentation: https://docs.ceph.com/en/latest/dev/mempool_accounting/
- Ceph mempool.cc source (confirming `by_pool` structure): https://github.com/ceph/ceph/blob/main/src/common/mempool.cc
- Ceph BlueStore Configuration Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph MGR Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph MGR Prometheus module source: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py
- Ceph Prometheus monitoring mixins: https://monitoring.mixins.dev/ceph/

## Issues Found

1. **Invalid `--top20` pprof flag (line 86)**: `--top20` is not a valid command-line flag for `google-pprof`. It is only available as an interactive-mode REPL command (`top20` at the `(pprof)` prompt), not as a CLI flag. Changed to `--text ... | head -20` which achieves the same result from the command line.

2. **Incorrect `dump_mempools` output format (lines 42-55)**: The example output showed pool entries (`osd`, `buffer_anon`) as direct children of `"mempool"`. The actual output nests them under a `"by_pool"` key, with a sibling `"total"` object. Confirmed via Ceph source code (`src/common/mempool.cc`) which calls `f->open_object_section("by_pool")`. Fixed to show the correct nested structure.

3. **Fabricated Prometheus metric name (line 117)**: `ceph_daemon_memory_usage` does not exist in the Ceph MGR Prometheus module. No metric with this name was found in the module source code, official documentation, or community dashboards. Replaced with `ceph_bluestore_cache_bytes` which tracks BlueStore cache memory per OSD.

4. **Inaccurate comment for `bluestore_cache_autotune` (line 129)**: The comment said "Enable automatic memory caching" but `bluestore_cache_autotune` enables automatic cache *size ratio tuning* — it dynamically adjusts how cache budget is split between metadata, KV, and data caches. BlueStore caching itself is always active. Changed comment to "Enable automatic cache size tuning".

5. **Inconsistent heap file paths in comparison section (lines 102-103)**: The comparison example used shortened paths (`/tmp/heap.0001.heap`) that didn't match the naming pattern established earlier in the post (`/tmp/ceph-osd.0.heap.0001.heap`). Fixed to use consistent file naming throughout.

## Review Notes
- The `ceph_osd_numpg` metric name and port 9283 for the Ceph Prometheus exporter were verified as correct.
- The `bluestore_cache_autotune` defaults to `true` since Ceph Nautilus, so the "enable" command may be redundant on modern clusters. However, it's still useful as a reference for operators who may have disabled it.
- The post could benefit from mentioning that in Rook-based (containerized) deployments, the heap profile dump path and admin socket access differ from bare-metal setups, but this is not a technical error — just an enhancement for future consideration.
- Package names (`google-perftools` for Debian, `gperftools` for RHEL) are correct.
