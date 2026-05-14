# Validation Summary: How to Create Thin LVM Snapshots Without Preallocating Space on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM2
- Thin-provisioned logical volumes
- Thin LVM snapshots
- XFS mounting options
- Bash shell commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing logical volumes": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/index
- Red Hat Enterprise Linux 9 documentation, "Advanced logical volume management": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/advanced-logical-volume-management_configuring-and-managing-logical-volumes
- Red Hat Enterprise Linux 9 documentation, "Managing system upgrades with snapshots": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/managing-system-upgrades-with-snapshots_configuring-and-managing-logical-volumes
- LVM2 lvcreate(8) manual page: https://man7.org/linux/man-pages/man8/lvcreate.8.html
- LVM2 lvmthin(7) manual page: https://man7.org/linux/man-pages/man7/lvmthin.7.html
- LVM2 lvchange(8) manual page: https://manpages.debian.org/testing/lvm2/lvchange.8.en.html
- LVM2 lvconvert(8) manual page: https://man7.org/linux/man-pages/man8/lvconvert.8.html

## Issues Found
- The comparison table said thin snapshots cannot overflow. Changed this to clarify that individual thin snapshots do not have a fixed per-snapshot allocation, but the shared thin pool can still run out of space.
- The activation section used `lvchange -pr` to enable auto-activation. That option changes LV permissions to read-only. Replaced it with `lvchange -kn`, which removes the activation skip flag used by thin snapshots.
- The restore merge example used `lvconvert --merge` and did not deactivate/reactivate the origin. Updated it to the RHEL-documented thin snapshot flow with `lvchange -an`, `lvconvert --mergethin`, and `lvchange -ay`.
- The "Promote the Snapshot" method incorrectly claimed `lvconvert --merge` disconnects a snapshot and makes it independent. Reworded the method to show activating and mounting the writable snapshot independently instead.
- The pool-full warning said all volumes freeze. Updated it to the more accurate behavior: writes to thin volumes can stall or fail depending on thin pool configuration and timeout behavior.
- Fixed a typo in the summary: "prealocation" to "preallocation".
- Clarified that snapshot pool usage can grow when either the origin or the snapshot is changed.

## Review Notes
The thin snapshot creation commands and the instruction to omit a size for thin snapshots match Red Hat and LVM2 documentation. The XFS `nouuid` mount option is appropriate when mounting a snapshot of an XFS filesystem with the same UUID as the origin.
