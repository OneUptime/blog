# Validation Summary: How to Grow and Reshape an Existing mdadm RAID Array on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux mdraid / mdadm
- RAID 1, RAID 5, RAID 6, RAID 10, and RAID 0 reshape behavior
- XFS and ext4 filesystem growth
- dracut initramfs regeneration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing RAID": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/managing-raid_managing-storage-devices
- Red Hat Enterprise Linux 9 documentation, "Increasing the size of an XFS file system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/increasing-the-size-of-an-xfs-file-system_managing-file-systems
- Red Hat Enterprise Linux 9 documentation, "Resizing an ext4 file system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/managing_file_systems/getting-started-with-an-ext4-file-system_managing-file-systems
- mdadm(8) manual page: https://man7.org/linux/man-pages/man8/mdadm.8.html
- xfs_growfs(8) manual page: https://man7.org/linux/man-pages/man8/xfs_growfs.8.html
- Red Hat documentation examples for dracut initramfs regeneration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening

## Issues Found
- The prerequisites said mdadm uses a backup file but did not state that the file must be outside the array being reshaped. The mdadm manual states that for chunk-size and layout changes, the backup file must be available for assembly and cannot be stored on the device being reshaped. Updated the prerequisite to require free space outside the array.
- The post said active-device shrinking is not possible in most cases. mdadm and Red Hat documentation support shrinking with the correct sequence: shrink the filesystem first, reduce the visible array size, then perform the irreversible device-count reduction. Updated the restriction to describe the required caution instead of implying it is generally unsupported.
- The post said RAID 0 cannot be reshaped to RAID 5 directly. The mdadm manual documents conversions between RAID0, RAID4, and RAID5, with mdadm using a special RAID4 staging path internally for some RAID0 reshapes. Updated the statement to reflect supported-but-careful RAID0 conversion behavior.

## Review Notes
The core mdadm grow, level-change, chunk-size, layout-change, backup-file, assemble-after-crash, filesystem growth, mdadm.conf update, and dracut examples are consistent with the consulted documentation. For production use, readers should still validate exact disk names, partitioning policy, boot dependencies, and rescue procedures for their own RHEL system before reshaping live storage.
