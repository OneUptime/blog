# Validation Summary: How to Optimize Ceph for Sequential Read Workloads

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Ceph (BlueStore, RADOS, RBD, Erasure Coding)
- Rook (Kubernetes StorageClass with CSI)
- Linux block layer (udev, sysfs, blockdev)
- fio (benchmarking)
- iostat (monitoring)

## Sources Consulted
- Ceph official documentation: `ceph osd pool set` valid pool properties — https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph official documentation: BlueStore configuration reference (`bluestore_max_blob_size`, `bluestore_max_blob_size_ssd`, `bluestore_max_blob_size_hdd`) — https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph official documentation: RBD readahead configuration (`rbd_readahead_trigger_requests`, `rbd_readahead_max_bytes`, `rbd_readahead_disable_after_bytes`) — https://docs.ceph.com/en/latest/rbd/rbd-config-ref/
- Ceph official documentation: RBD image creation (`rbd create --object-size`) — https://docs.ceph.com/en/latest/man/8/rbd/
- Ceph official documentation: Erasure code profiles — https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Rook documentation: StorageClass configuration — https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Linux man pages: blockdev(8), fio(1), iostat(1)

## Issues Found

### Issue 1: Invalid `stripe_unit` pool property (FIXED)
- **What was wrong:** The command `ceph osd pool set streaming-data stripe_unit 65536` uses `stripe_unit`, which is not a valid `ceph osd pool set` parameter. Running this command would produce `Error EINVAL: unrecognized variable 'stripe_unit'`. Stripe unit is a client-level layout parameter (configured via `rbd create --stripe-unit` for RBD or `setfattr` for CephFS), not a pool-level property.
- **What was changed:** Removed the invalid `ceph osd pool set streaming-data stripe_unit 65536` line from the Object Size Tuning section.
- **Why:** The command would fail and could confuse readers who try to follow the guide.

### Issue 2: `bluestore_max_blob_size` overrides media-specific settings (FIXED)
- **What was wrong:** The post set `bluestore_max_blob_size` (the generic option) to 131072 (128 KB), then set `bluestore_max_blob_size_hdd` to 524288 (512 KB). When the generic `bluestore_max_blob_size` is non-zero, it overrides both media-specific settings (`_ssd` and `_hdd`). This means the HDD-specific line was effectively dead — all OSDs would use 128 KB regardless of media type.
- **What was changed:** Replaced `bluestore_max_blob_size` with `bluestore_max_blob_size_ssd` so both media-specific settings function independently. Also updated the inline comment from "Increase sequential read buffer" to "Increase blob size for sequential reads" for accuracy.
- **Why:** The original configuration silently ignored the HDD setting, resulting in smaller-than-intended blob sizes on HDD OSDs.

## Review Notes
- **RBD readahead values are defaults:** The three `rbd_readahead_*` settings shown (`trigger_requests=10`, `max_bytes=524288`, `disable_after_bytes=52428800`) are all set to their Ceph default values. While the commands are syntactically valid, presenting defaults as tuning recommendations is misleading. A future revision could either note these are defaults shown for reference, or suggest actually tuned values (e.g., larger `rbd_readahead_max_bytes` for high-throughput streaming).
- **iostat column references are version-dependent:** The `awk` command `'/sda/ {print "rkB/s:", $6, "rMerged/s:", $4}'` references column numbers that vary between sysstat versions. In the traditional format (pre-12), `$6` is `rkB/s` (correct) but `$4` is `r/s` (not merged reads — merged reads is `$2`). In sysstat 12+, the column layout changed entirely. The labels don't match the column numbers in any single sysstat version.
- **BlueStore HDD blob size is the default:** `bluestore_max_blob_size_hdd` is being set to 524288, which is already the default value. For sequential read optimization, a larger value (e.g., 1 MB) might provide more benefit.
- **Pool creation with explicit PG counts:** The `ceph osd pool create` commands specify PG counts explicitly (128). Modern Ceph (Nautilus+) enables PG autoscaling by default, so explicit PG counts are not required and the autoscaler may override them. This is not wrong but worth noting for readers on newer clusters.
