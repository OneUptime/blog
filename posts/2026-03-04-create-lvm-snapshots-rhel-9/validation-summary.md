# Validation Summary: How to Create LVM Snapshots on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM logical volumes
- Thick LVM snapshots
- Thin LVM snapshots
- XFS snapshot mounting
- Linux mount, umount, tar, and shell commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes, Chapter 5, Advanced logical volume management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/advanced-logical-volume-management_configuring-and-managing-logical-volumes
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes, thick snapshot creation and monitoring guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/advanced-logical-volume-management_configuring-and-managing-logical-volumes#managing-thick-logical-volume-snapshots_advanced-logical-volume-management
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes, thick and thin snapshot merge procedures: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/advanced-logical-volume-management_configuring-and-managing-logical-volumes#merging-thick-logical-volume-snapshots_advanced-logical-volume-management
- Red Hat Enterprise Linux 9 documentation: Snapshot of logical volumes / RHEL system role notes for XFS `nouuid`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_and_managing_logical_volumes/red_hat_enterprise_linux-9-configuring_and_managing_logical_volumes-en-us.pdf
- Linux manual page for LVM reporting fields, including `snap_percent`: https://man7.org/linux/man-pages/man7/lvmreport.7.html

## Issues Found
- The post described all LVM snapshots as using the thick snapshot copy-on-write behavior. RHEL 9 distinguishes thick snapshots from thin snapshots, and thin-provisioned LVs use different creation and merge behavior. Updated the wording to specify thick snapshots and added a short note that thin snapshots are created without `-L` and merged with `lvconvert --mergethin`.
- The restore procedure ran `lvconvert --merge` before deactivating the original LV and did not deactivate the snapshot LV. Red Hat's RHEL 9 procedure unmounts and deactivates both the origin and snapshot before merging a thick snapshot. Updated the command sequence accordingly.
- The backup script always used `nouuid`, which is specifically needed for XFS when mounting a snapshot alongside the origin and is not a generic filesystem option. Added a `MOUNT_OPTIONS` variable and noted that non-XFS filesystems should use `ro`.

## Review Notes
The commands are valid for thick LVM snapshots on RHEL 9. The post does not cover application-level quiescing or filesystem freezing before snapshots; this can matter for crash-consistent versus application-consistent backups, but it is outside the scope of the existing tutorial.
