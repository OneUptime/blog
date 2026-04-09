# Validation Summary: How to Fix 'slow requests are blocked' in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (OSD, MON, BlueStore)
- Rook (Rook-Ceph operator on Kubernetes)
- Kubernetes (kubectl)
- Linux diagnostic tools (iostat, dmesg, ping, mtr)

## Sources Consulted
- Ceph official documentation on OSD configuration options (`osd_op_complaint_time`, `osd_max_backfills`, `osd_recovery_max_active`, `osd_recovery_op_priority`) — https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph official documentation on BlueStore configuration (`bluestore_cache_size`, `bluestore_cache_size_ssd`, `bluestore_cache_size_hdd`) — https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph official documentation on `ceph tell` and `injectargs` — https://docs.ceph.com/en/latest/rados/operations/control/
- Rook-Ceph documentation on CephCluster resource spec — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/

## Issues Found
- **BlueStore cache size recommendation was incorrect (Step 9):** The post recommended setting `--bluestore-cache-size=2147483648` (2 GB) "for SSDs" as an increase, but the default `bluestore_cache_size_ssd` is already 3 GB (3221225472). Setting the generic `bluestore_cache_size` to 2 GB would actually *decrease* the SSD cache. Fixed by changing the command to use `--bluestore-cache-size-ssd=4294967296` (4 GB), which is the SSD-specific option and represents an actual increase above the default.

## Review Notes
- The `--debug-osd=0` recommendation in Step 7 to "disable" debug logging sets the level below the Ceph default of `1/5`. This is acceptable for a temporary reset but users should be aware the default is not 0. Not changed since the post frames this as temporary.
- The post uses `injectargs` for runtime configuration changes. For persistent changes in newer Ceph versions (Quincy+), `ceph config set` is the preferred approach. The `injectargs` method still works but changes are lost on OSD restart.
- All kubectl commands, Ceph CLI commands, and diagnostic tool usage are correct and follow standard Rook-Ceph patterns.
- The CephCluster resource YAML for setting OSD memory resources is correct for the Rook operator.
