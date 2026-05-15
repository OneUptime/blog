# Validation Summary: How to Create a Deduplicated and Compressed LVM-VDO Volume on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM
- LVM-VDO
- VDO deduplication and compression
- XFS and ext4 filesystems
- TRIM/discard and fstrim

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deduplicating and compressing logical volumes on RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deduplicating_and_compressing_logical_volumes_on_rhel/
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- lvmvdo(7) manual page: https://www.man7.org/linux/man-pages/man7/lvmvdo.7.html

## Issues Found
- The prerequisite package list omitted the `vdo` userspace package, which provides VDO management tools such as `vdostats`. Updated the package list and `dnf install` command to include `vdo`.
- The `lvcreate` example did not name the VDO pool LV, but later commands need to target the VDO pool for settings and statistics. Added `--vdopool vpool_vdo` and documented the parameter.
- The `/etc/fstab` example used `x-systemd.requires=vdo.service` and enabled continuous `discard`. For LVM-VDO on RHEL 9, Red Hat documents a normal fstab entry and recommends periodic `fstrim` over the `discard` mount option because of performance impact. Updated the fstab entry and added `systemctl enable --now fstrim.timer`.
- The `vdostats` example did not specify the LVM-VDO pool mapper device. Updated it to use `/dev/mapper/vg_vdo-vpool_vdo-vpool`, matching the named VDO pool.
- The `lvchange --compression` and `lvchange --deduplication` examples targeted the VDO LV. These settings are applied to the VDO pool LV, so the commands now target `vg_vdo/vpool_vdo`.
- The virtual-size expansion command used `lvextend --virtualsize`, which is not the documented form for resizing an existing VDO LV. Updated it to `lvextend --size 500G vg_vdo/lv_vdo`, followed by `xfs_growfs`.
- The description of `vdo_saving_percent` called it a ratio. It is a percentage of saved space, so the wording was corrected.
- The UDS memory guidance was oversimplified as 1 GB per 1 TB of physical storage. Updated it to distinguish dense and sparse UDS index deduplication windows.

## Review Notes
The tutorial is technically relevant and mostly aligned with Red Hat's RHEL 9 LVM-VDO documentation after the corrections. Future improvements could mention VDO slab sizing for VDO pools larger than 16 TiB and clarify that physical pool usage must be monitored because VDO is thin-provisioned.
