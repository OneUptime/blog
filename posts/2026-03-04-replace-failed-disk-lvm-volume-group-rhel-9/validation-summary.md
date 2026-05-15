# Validation Summary: How to Replace a Failed Disk in an LVM Volume Group on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM2
- Physical volumes, volume groups, and logical volumes
- LVM RAID and mirroring repair
- Linux storage troubleshooting commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/index
- Red Hat Enterprise Linux 9 documentation: Removing physical volumes from a volume group: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/managing-lvm-volume-groups_configuring-and-managing-logical-volumes#removing-physical-volumes-from-a-volume-group_managing-lvm-volume-groups
- Red Hat Enterprise Linux 9 documentation: Removing lost LVM physical volumes from a volume group: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/troubleshooting-lvm_configuring-and-managing-logical-volumes#removing-lost-lvm-physical-volumes-from-a-volume-group_troubleshooting-lvm
- Red Hat Enterprise Linux 9 documentation: Replacing a failed RAID device in a logical volume: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/configuring-raid-logical-volumes_configuring-and-managing-logical-volumes
- Linux man-pages project: lvmraid(7): https://man7.org/linux/man-pages/man7/lvmraid.7.html

## Issues Found
- The original `pvmove` guidance did not mention that the volume group needs enough free extents on other physical volumes. I added a short note that administrators should add the replacement physical volume first if there are not enough free extents, then run `pvmove` before `vgreduce`.
- The original forced removal command skipped Red Hat's documented `vgchange --activate y --partial` and `vgreduce --removemissing --test` checks. I added those commands before the destructive `vgreduce --removemissing --force` command.
- The original text said logical volumes might remain partial after forced removal. Red Hat documents that forced `vgreduce --removemissing` removes logical volumes that used the lost physical volume. I corrected the explanation and kept the backup warning.
- The condensed procedure used `lvchange -ay vg_data` to activate a volume group and labeled the check as a repair. I changed this to `vgchange -ay vg_data`, which is the documented command for activating all logical volumes in a volume group, and clarified that the subsequent command checks the remaining logical volumes.

## Review Notes
The overall workflow is technically valid for RHEL 9 LVM administration. In a future revision, the post could distinguish more explicitly between non-redundant linear LVs, legacy LVM mirrors, and LVM RAID volumes, because the safest replacement path depends on the LV segment type.
