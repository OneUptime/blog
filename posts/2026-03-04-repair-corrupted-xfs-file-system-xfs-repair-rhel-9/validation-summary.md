# Validation Summary: How to Repair a Corrupted XFS File System with xfs_repair on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- XFS file systems
- xfsprogs
- xfs_repair
- xfs_info
- fuser
- smartmontools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Checking and repairing a file system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/checking-and-repairing-a-file-system__managing-file-systems
- Red Hat Enterprise Linux 7 documentation: Repairing an XFS File System: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/xfsrepair
- xfs_repair(8) manual page from xfsprogs: https://man7.org/linux/man-pages/man8/xfs_repair.8.html
- xfs_info(8) manual page from xfsprogs: https://man7.org/linux/man-pages/man8/xfs_info.8.html
- Local fuser(1) manual page

## Issues Found
- The busy-filesystem example used `umount -l` before repair. Lazy unmount detaches the mount point but can leave the filesystem active until references are released, which is unsafe before `xfs_repair`. Changed the example to identify users with `fuser -mv`, terminate them with `fuser -km`, and then perform a normal `umount`.
- The `xfs_repair` phase descriptions for phases 3 through 7 did not match the phases normally reported by the tool. Updated them to describe allocation group/inode discovery, duplicate block checks, allocation group header/tree rebuilds, inode connectivity checks, and link count verification.
- The severe-corruption section incorrectly described `-o ag_stride=4` as a way to manually specify an alternate superblock. `ag_stride` controls additional processing threads for allocation groups spanning concat units. Replaced this with the documented `-o force_geometry` caveat and a no-modify example for cases where geometry cannot be validated.

## Review Notes
The remaining commands and explanations are technically consistent with RHEL and xfsprogs documentation. In a future revision, the post could recommend creating an `xfs_metadump` metadata image before repair, as Red Hat documents this as useful for diagnostics and support investigations.
