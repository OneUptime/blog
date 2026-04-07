# Validation Summary: How to Tune bluestore_cache_size for Performance

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Ceph BlueStore
- Rook-Ceph (Kubernetes operator)
- RocksDB (as BlueStore's metadata backend)
- Kubernetes ConfigMaps

## Sources Consulted
- Ceph official documentation on BlueStore configuration: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph perf counters documentation: https://docs.ceph.com/en/latest/dev/perf_counters/
- Ceph CLI reference for `ceph config` subcommands
- Rook-Ceph documentation on configuration overrides

## Issues Found

1. **Incorrect default cache sizes**: The post stated defaults were "1 GB for SSD OSDs, 300 MB for HDD OSDs." The actual defaults in modern Ceph (Reef, Squid) are 3 GB for SSD OSDs and 1 GB for HDD OSDs. Fixed to reflect correct values.

2. **Wrong cache ratio defaults and mislabeled components**: The comment stated "Default ratio: 0.37 for meta (RocksDB), 0.13 for kv_sync" which was incorrect in two ways: (a) the actual defaults are 0.4 for meta and 0.4 for kv, and (b) "meta" refers to BlueStore onode metadata, not RocksDB — the "kv" ratio is the one for RocksDB block cache. Fixed both the values and labels. Also changed `ceph config show` to `ceph config get` for querying a specific key.

3. **Wrong perf counter names and access pattern**: The monitoring script used `bluestore_cache_hits` and `bluestore_cache_misses` (plural) with `.get('avgcount', 0)`. The actual counter names are `bluestore_cache_hit` and `bluestore_cache_miss` (singular), and they are plain integer counters, not objects with avgcount fields. Fixed both the names and access pattern.

4. **Initial cache stats script used non-existent counter**: The first script referenced `bluestore_cache_hit_ratio` which is not a real perf counter. Replaced with manual calculation from hit/miss counters.

5. **Cache pressure section used config option as perf counter**: `bluestore_cache_trim_max_skip_pinned` is a configuration option (controlling how many pinned items the trimmer skips), not a perf counter. Rewrote the section to use cache hit ratio as the pressure indicator instead.

## Review Notes
- The cache size guidelines table (25-50% of RAM per OSD) is reasonable general advice, though optimal values depend heavily on workload characteristics.
- With `bluestore_cache_autotune` enabled by default since Ceph Nautilus, the static cache ratio settings (`bluestore_cache_meta_ratio`, `bluestore_cache_kv_ratio`) serve more as hints to the auto-tuner. The post could mention auto-tuning in a future revision.
- The Rook ConfigMap override approach is valid but users should be aware that OSD restarts may be needed for cache size changes to take effect.
