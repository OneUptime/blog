# Validation Summary: How to Tune VDO Memory and CPU Usage for Performance on RHEL 9

## Status
validated

## Post Type
Tutorial / performance tuning guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM-VDO
- VDO deduplication and compression
- LVM CLI commands (`lvs`, `lvcreate`, `lvchange`)
- `fio`, `vdostats`, `top`, and `pidstat`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deduplicating and compressing logical volumes on RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deduplicating_and_compressing_logical_volumes_on_rhel/index
- Red Hat Enterprise Linux 9 documentation: Optimizing LVM-VDO performance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deduplicating_and_compressing_logical_volumes_on_rhel/optimizing-vdo-performance_deduplicating-and-compressing-logical-volumes-on-rhel
- Upstream `lvmvdo(7)` manual page: https://www.man7.org/linux/man-pages/man7/lvmvdo.7.html
- Linux kernel `dm-vdo` documentation: https://docs.kernel.org/admin-guide/device-mapper/vdo.html
- LVM `lvm.conf(5)` VDO setting descriptions: https://www.mankier.com/5/lvm.conf

## Issues Found
- The post used `index_memory=1` and described the value as gigabytes for `lvchange`. LVM-VDO uses `vdo_index_memory_size_mb` in MiB, and index memory is chosen at creation time. Changed the dense-index example to use `lvcreate --vdosettings 'vdo_index_memory_size_mb=1024'` and clarified the unit and creation-time limitation.
- The sparse-index example set only `index_memory=0.25`, which is not the correct LVM-VDO setting and does not enable sparse indexing. Changed it to `vdo_use_sparse_index=1 vdo_index_memory_size_mb=256`.
- Several `lvchange --vdosettings` examples changed non-compression VDO settings while the volume was active. Red Hat and `lvmvdo(7)` document that such changes require deactivation and take effect on the next start. Added `lvchange -an` and `lvchange -ay` around those examples.
- The block map cache section omitted documented constraints. Added the documented minimum, multiple, and per-logical-thread requirement.
- The write-policy section labeled synchronous mode as the default. LVM documents `vdo_write_policy = "auto"` as the automatic default. Updated the heading and moved the default note to Auto mode.
- Multi-setting `--vdosettings` examples used comma-separated values. The LVM documentation shows space-separated `option=value` pairs, so those examples were changed to the documented form.
- The monitoring command `top -H -p $(pgrep -d',' kvdo)` was brittle for VDO kernel threads. Changed it to `top -H`, matching Red Hat's documented thread-monitoring approach, and changed the `pidstat` example to select `kvdo` commands with `-C`.
- The memory-constrained profile used an invalid `index_memory=0.25` setting and an invalid 64 MB block map cache size. Removed the index change from the existing-volume profile and raised the block map cache value to the documented 128 MB minimum.
- The maximum deduplication profile attempted to change index memory on an existing volume. Removed the non-changeable index setting and kept tunable settings for an existing volume.

## Review Notes
The post is now technically valid for RHEL 9 LVM-VDO. Future improvements could add a short reminder to unmount filesystems before deactivating an LVM-VDO volume and to choose UDS index settings during volume creation based on the desired deduplication window.
