# Validation Summary: How to Enable and Disable VDO Compression on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM-VDO
- VDO compression and deduplication
- `lvcreate`, `lvchange`, and `lvs`
- `vdostats`
- `fio`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deduplicating and compressing logical volumes on RHEL, including LVM-VDO creation and changing compression/deduplication settings: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deduplicating_and_compressing_logical_volumes_on_rhel/index
- `lvmvdo(7)` manual page for VDO behavior, LZ4 compression, and the requirement for VDO userspace tools: https://manpages.ubuntu.com/manpages/questing/man7/lvmvdo.7.html
- `lvcreate(8)` manual page for `--type vdo`, `--compression y|n`, and `--deduplication y|n`: https://man7.org/linux/man-pages/man8/lvcreate.8.html
- `vdostats(8)` manual page for supported output fields and `--verbose` metrics: https://manpages.debian.org/testing/vdo/vdostats.8.en.html
- dm-vdo/kvdo project documentation for VDO's LZ4 compression and compressed block packing behavior: https://github.com/dm-vdo/kvdo

## Issues Found
- The prerequisites omitted the `vdo` userspace package. Red Hat's RHEL 9 VDO installation guidance includes `lvm2`, `kmod-kvdo`, and `vdo`, so the prerequisite list was updated.
- The `lvchange --compression` and `lvchange --deduplication` examples targeted the VDO LV path (`vg_vdo/lv_vdo`). Red Hat documents these changes against the VDO pool LV, so the examples now use pool LV names such as `vg_vdo/vpool0`.
- The monitoring section listed `compressed blocks in use`, which is not one of the stable `vdostats --verbose` fields documented by the `vdostats(8)` manual. It was replaced with the documented `compressed blocks written` metric and an accurate description.

## Review Notes
The remaining command syntax and explanations are consistent with RHEL 9 LVM-VDO documentation: compression and deduplication are enabled by default, can be controlled independently, VDO uses LZ4 compression, and `vdostats --human-readable`/`--verbose` are appropriate for monitoring space usage and compression activity. Local CLI verification was not possible because LVM tools are not installed in this workspace, so command validation was performed against official Red Hat documentation and manual pages.
