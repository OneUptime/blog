# Validation Summary: How to Use VDO with DRBD for Replicated Deduplicated Storage on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM-VDO
- DRBD 9
- XFS
- Linux block storage

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deduplicating and compressing logical volumes on RHEL, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deduplicating_and_compressing_logical_volumes_on_rhel/index
- Red Hat Enterprise Linux 9 documentation: Considerations in adopting RHEL 9, https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/considerations_in_adopting_rhel_9/considerations-in-adopting-rhel-9.pdf
- LINBIT DRBD 9 User Guide, https://linbit.com/drbd-user-guide/drbd-guide-9_0-en/
- LINBIT DRBD 9 man pages, https://linbit.com/man/v9/

## Issues Found
- The post used the standalone `vdo create` workflow. Red Hat documents VDO on RHEL 9 as LVM-VDO managed with `lvcreate --type vdo`, and Red Hat's RHEL 9 adoption notes state that the Python-based VDO Management software is no longer available. I changed the VDO creation example to create an LVM physical volume, volume group, and LVM-VDO logical volume.
- The DRBD backing device path pointed to `/dev/mapper/vdo-data`, which would not be created by the corrected RHEL 9 LVM-VDO workflow. I changed it to `/dev/vg_vdo/vdo-data`.
- The package installation command listed `drbd` and `kernel-modules-extra`. LINBIT documents DRBD packages for RHEL through DRBD repositories, and the kernel module must be installed separately. I added a prerequisite for a LINBIT or compatible DRBD repository and changed the package list to include `drbd-utils` and `kmod-drbd`, while keeping the RHEL VDO packages documented by Red Hat.

## Review Notes
The post now describes a manual active/passive DRBD setup. In production, DRBD role changes, mounting, fencing, and split-brain handling are usually managed by a cluster manager such as Pacemaker, but the manual commands shown are technically valid for a basic guide.
