# Validation Summary: How to Configure Garbage Collection Settings in Ceph RGW

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- RADOS object storage
- radosgw-admin CLI

## Sources Consulted
- Ceph official documentation on RGW garbage collection: https://docs.ceph.com/en/latest/radosgw/gc/
- Ceph configuration reference for RGW settings: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Rook documentation on Ceph configuration overrides: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/

## Issues Found
1. **Incorrect GC log pool reference**: The post stated that GC data is stored in the `.rgw.root` pool. This is incorrect — `.rgw.root` stores realm, zonegroup, and zone metadata. The GC queue objects are stored in the zone's dedicated GC pool (e.g., `default.rgw.gc`). Fixed the reference to point to the correct pool.

2. **Wrong pool in troubleshooting grep**: The troubleshooting section used `ceph df detail | grep -A5 "\.rgw\.root"` to check storage reclamation after GC. Since `.rgw.root` is a small metadata pool, checking it would not show meaningful storage changes from GC. Changed to grep for `rgw\.buckets\.data`, which is the data pool where actual object data resides and where freed space would be visible.

## Review Notes
- All `ceph config` commands use correct syntax and valid configuration parameter names.
- Default values cited for `rgw_gc_obj_min_wait` (7200s), `rgw_gc_processor_max_time` (3600s), and `rgw_gc_processor_period` (3600s) are accurate.
- The `radosgw-admin gc list` and `gc process` commands with `--include-all` flag are correct.
- The Rook `rook-config-override` ConfigMap approach is the standard method for injecting custom Ceph config in Rook-managed clusters.
- The `rgw_gc_max_objs` default of 32 is correct for current Ceph releases.
