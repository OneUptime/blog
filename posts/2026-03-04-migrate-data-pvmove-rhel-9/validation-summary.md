# Validation Summary: How to Migrate Data Between Physical Volumes Using pvmove on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM2
- pvmove
- Physical volumes and volume groups
- Linux storage administration commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes - Removing a disk from a logical volume: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/removing-a-disk-from-a-logical-volume_managing-lvm-logical-volumes
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes - Removing LVM physical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- LVM2 pvmove(8) manual page: https://man7.org/linux/man-pages/man8/pvmove.8.html

## Issues Found
- The performance section said pvmove "doubles the write I/O." The LVM pvmove manual documents that pvmove creates temporary mirror segments and copies data from the original location to a newly allocated location, which adds read/write I/O while segments are copied. I changed the wording to avoid the overly broad claim that all write I/O is simply doubled.

## Review Notes
The pvmove command forms shown in the post are consistent with the LVM2 pvmove examples for moving all extents, selecting a destination PV, and using `-n` to move extents for a single LV. The disk replacement flow also matches RHEL guidance: create or add a replacement PV, extend the VG when needed, move extents with `pvmove`, then remove the old PV from the VG before running `pvremove`.
