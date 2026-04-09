# Validation Summary: How to Identify Good and Bad Workloads for Cache Tiering

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (cache tiering, CRUSH rules, BlueStore, OSD pools)
- Rook (Ceph operator for Kubernetes)
- rados bench (Ceph benchmarking tool)
- fio (Flexible I/O Tester)

## Sources Consulted
- Ceph official documentation on cache tiering: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph official documentation on rados bench: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph official documentation on BlueStore config: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph official documentation on CRUSH rules and pool management: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- fio documentation: https://fio.readthedocs.io/en/latest/
- Ceph Pacific release notes (cache tiering deprecation)

## Issues Found
No technical issues found.

## Review Notes
- The `--no-cleanup` flag on `rados bench` read modes (`rand`, `seq`) is harmless but unnecessary — it is only meaningful after a write benchmark to preserve created objects. Not an error, just a minor style point.
- The `bluestore_cache_size` config option works but newer Ceph releases prefer the more granular `bluestore_cache_size_hdd` and `bluestore_cache_size_ssd` options. The command shown is still valid.
- The `ceph osd pool create hot-pool 64 64 replicated` command uses the older explicit pgp_num syntax. Since Nautilus, pgp_num auto-adjusts, so the second `64` is redundant but still accepted. Not an error.
- The deprecation notice for Ceph Pacific is correctly placed and accurate. This is important context for readers.
