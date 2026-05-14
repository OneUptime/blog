# Validation Summary: How to Troubleshoot VDO Volume Recovery on RHEL 9

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM-VDO
- VDO and UDS deduplication
- XFS repair
- Linux storage and device-mapper utilities

## Sources Consulted
- Red Hat Enterprise Linux 9: Deduplicating and compressing logical volumes on RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deduplicating_and_compressing_logical_volumes_on_rhel/index
- Red Hat Enterprise Linux 8: Maintaining VDO, especially operating modes and recovery behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/deduplicating_and_compressing_storage/maintaining-vdo_deduplicating-and-compressing-storage
- LVM `lvmvdo(7)` manual page: https://www.mankier.com/7/lvmvdo
- LVM command arguments reference for VDO options: https://www.mankier.com/7/lvm-args
- `vdoforcerebuild(8)` manual page: https://www.mankier.com/8/vdoforcerebuild

## Issues Found
- The prerequisites and package installation commands omitted the `vdo` userspace package. Red Hat's RHEL 9 VDO installation procedure installs `lvm2`, `kmod-kvdo`, and `vdo`, so the post now lists and installs all three.
- Physical-space recovery commands extended the visible VDO LV instead of the VDO pool. Red Hat's LVM-VDO documentation grows physical capacity by extending the VDO pool LV, so the examples now use `vg_vdo/vpool0`.
- The UDS recovery section used `lvchange --rebuild-full`, which is not a supported LVM-VDO option. The section now describes disabling and re-enabling deduplication on the VDO pool instead of invoking an invalid command.
- VDO tuning and deduplication commands targeted the VDO LV. Red Hat documents these settings as VDO pool operations, so the commands now target `vg_vdo/vpool0` and deactivate/reactivate the visible LV where settings require a restart.
- The XFS `xfs_repair -L` example lacked the required data-loss caveat. The post now warns to use `-L` only when log replay by mounting is not possible.
- Diagnostic package collection omitted `vdo`; it now queries `lvm2`, `kmod-kvdo`, and `vdo`.

## Review Notes
The example assumes the automatically created VDO pool is named `vpool0`, which matches Red Hat examples and the post's existing `/dev/mapper/vg_vdo-vpool` convention. In a future revision, the post could add a brief note to confirm the pool name with `lvs -a` before copying commands.
