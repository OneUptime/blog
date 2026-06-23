# Validation Summary: How to Set Up LVM (Logical Volume Manager) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- Linux Logical Volume Manager (LVM2)
- Physical Volumes, Volume Groups, and Logical Volumes
- ext4 and XFS filesystems
- LVM snapshots
- LVM thin provisioning
- LVM cache
- LVM RAID/mirroring

## Sources Consulted
- Ubuntu Server documentation: How to manage logical volumes: https://ubuntu.com/server/docs/how-to/storage/manage-logical-volumes/
- Red Hat Enterprise Linux 9 documentation: Overview of logical volume management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/overview-of-logical-volume-management_configuring-and-managing-logical-volumes
- Red Hat Enterprise Linux 9 documentation: Advanced logical volume management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/advanced-logical-volume-management_configuring-and-managing-logical-volumes
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/index
- Upstream LVM man page: lvcreate(8): https://man7.org/linux/man-pages/man8/lvcreate.8.html
- Upstream LVM man page: lvreduce(8): https://man7.org/linux/man-pages/man8/lvreduce.8.html
- Upstream LVM man page: lvconvert(8): https://man7.org/linux/man-pages/man8/lvconvert.8.html
- Upstream LVM man page: lvmthin(7): https://man7.org/linux/man-pages/man7/lvmthin.7.html
- Linux kernel dm-cache documentation: https://www.kernel.org/doc/Documentation/device-mapper/cache.txt

## Issues Found
- The post described LVM mirroring as high availability. Changed this to disk redundancy because LVM mirroring/RAID protects against device failure but does not by itself provide full service high availability.
- The manual shrink example resized the ext4 filesystem to 180G and then reduced the LV to 200G, leaving an avoidable size mismatch. Changed the `resize2fs` target to 200G to match the following `lvreduce -L 200G` command.
- The snapshot restore section stated that a merge happens on next activation unconditionally. Updated the wording to clarify that this applies when the merge is deferred because the origin was active.
- The thin pool example said it specified metadata size but did not include `--poolmetadatasize`. Added `--poolmetadatasize 1G`.
- The mirroring example used the legacy `mirror` segment type. Updated it to use `--type raid1`, which is the current LVM RAID1 mirroring style.
- The Ubuntu LVM resource link used an old URL. Updated it to the current Ubuntu Server logical volume management documentation page.

## Review Notes
- The local environment did not have `lvm2` installed, so command verification was performed against upstream LVM man pages and vendor documentation rather than local `--help` output.
- The guide remains a broad administrative tutorial. Operators should still adapt device names, filesystem choices, snapshot sizes, and thin pool monitoring thresholds to their specific systems before running destructive storage commands.
