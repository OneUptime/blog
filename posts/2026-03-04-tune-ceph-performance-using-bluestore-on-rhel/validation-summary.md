# Validation Summary: How to Tune Ceph Performance Using BlueStore on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Ceph Storage
- Ceph BlueStore
- Ceph OSD service specifications
- Ceph configuration database
- RADOS benchmark tooling
- Linux block device tuning

## Sources Consulted
- Ceph BlueStore Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph OSD Service documentation: https://docs.ceph.com/en/latest/cephadm/services/osd/
- Ceph rados utility manual: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph pool operations documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph mClock Config Reference: https://docs.ceph.com/en/reef/rados/configuration/mclock-config-ref/
- Ceph Pacific OSD Config Reference: https://docs.ceph.com/en/pacific/rados/configuration/osd-config-ref/
- Red Hat Ceph Storage 7 BlueStore Administration Guide: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/7/html/administration_guide/bluestore
- Red Hat Ceph Storage 9 Operations Guide: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/9/html-single/operations_guide/index

## Issues Found
- The post used `bluestore_cache_data_ratio`, which is not a documented Ceph configuration option. I removed that command and clarified that the data cache fraction is calculated as the remainder after `bluestore_cache_meta_ratio` and `bluestore_cache_kv_ratio`.
- The cache tuning section implied fixed BlueStore cache sizes are the normal tuning path. Current Ceph enables BlueStore cache autotuning by default, so I added `osd_memory_target` as the primary setting and made manual cache sizing conditional on disabling `bluestore_cache_autotune`.
- The allocation section stated that the HDD minimum allocation default is 64K. Current Ceph and Red Hat Ceph Storage documentation state that the default is 4 KiB for both HDD and SSD OSDs, so I corrected the comment.
- The allocation section did not mention that `bluestore_min_alloc_size` values are applied only at OSD creation. I added a note that existing OSDs must be rebuilt to use a different value.
- The recovery section used `osd_recovery_sleep_hdd`, which is disabled when mClock is active. I replaced that example with the documented mClock recovery override gate and `osd_recovery_max_active_hdd`, and added a short caveat about mClock profiles and recovery sleep options.

## Review Notes
The OSD service specification uses top-level `data_devices`, `db_devices`, and `wal_devices`, which is consistent with Red Hat Ceph Storage operations guide examples. Upstream Ceph development documentation also shows newer examples nesting these keys under `spec:`, so future updates should align the snippet with the exact RHCS major version targeted by the post.
