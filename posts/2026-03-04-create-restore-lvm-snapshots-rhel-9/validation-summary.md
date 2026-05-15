# Validation Summary: How to Create and Restore LVM Snapshots on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Logical Volume Manager (LVM)
- LVM thick snapshots
- XFS snapshot mounting
- Bash shell commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes, "Managing logical volume snapshots" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/advanced-logical-volume-management_configuring-and-managing-logical-volumes
- lvcreate(8) Linux manual page - https://man7.org/linux/man-pages/man8/lvcreate.8.html
- lvconvert(8) Linux manual page - https://man7.org/linux/man-pages/man8/lvconvert.8.html
- lvmreport(7) Linux manual page - https://man7.org/linux/man-pages/man7/lvmreport.7.html
- Red Hat Customer Portal: Unable to mount XFS filesystem due to duplicate UUID error - https://access.redhat.com/solutions/5494781
- Local mount(8) manual page for `mount -o ro` behavior

## Issues Found
- The post used `snap_percent` in `lvs` examples. While LVM supports snapshot percentage reporting, RHEL 9 documentation uses `data_percent` for snapshot usage examples. Updated the verification, monitoring, and alert examples to use `data_percent`.
- The snapshot sizing example used `lvs --units g` without `--nosuffix`, which can produce values such as `10.00g` that `bc` cannot multiply. Added `--nosuffix` and `scale=2` so the calculation produces a valid size for `lvcreate -L`.
- The backup section described the snapshot as "consistent" without qualification. LVM snapshots are point-in-time block snapshots; live databases and busy applications need quiescing or backup mode for application-consistent backups. Updated the wording to clarify this.
- The alert script selected snapshots with an `lv_attr` regular expression that was too fragile. Updated it to select LVs with a non-empty `origin`, matching the snapshot relationship exposed by `lvs`.

## Review Notes
The remaining commands and explanations are consistent with RHEL 9 LVM documentation: thick snapshots require upfront space, snapshots become invalid at 100% usage, `lvextend` can extend snapshots before they fill, XFS snapshots commonly require `nouuid`, and `lvconvert --merge` removes the snapshot after merge. For root or otherwise open origins, merge completion is deferred until the origin can be activated closed.
