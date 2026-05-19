# Validation Summary: How to Convert an ext4 File System to Btrfs on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Btrfs
- ext4
- btrfs-progs
- e2fsprogs
- /etc/fstab

## Sources Consulted
- Btrfs `btrfs-convert(8)` documentation: https://btrfs.readthedocs.io/en/latest/btrfs-convert.html
- Btrfs `btrfs-filesystem(8)` documentation: https://btrfs.readthedocs.io/en/latest/btrfs-filesystem.html
- Btrfs `btrfs-balance(8)` documentation: https://btrfs.readthedocs.io/en/latest/btrfs-balance.html
- Btrfs `btrfs-subvolume(8)` documentation: https://btrfs.readthedocs.io/en/latest/btrfs-subvolume.html
- Btrfs `btrfs-scrub(8)` documentation: https://btrfs.readthedocs.io/en/latest/btrfs-scrub.html
- Btrfs mount options documentation: https://btrfs.readthedocs.io/en/latest/ch-mount-options.html
- Btrfs deduplication documentation: https://btrfs.readthedocs.io/en/latest/Deduplication.html
- Btrfs reflink documentation: https://btrfs.readthedocs.io/en/latest/Reflink.html
- Ubuntu `fsck.btrfs(8)` manpage: https://manpages.ubuntu.com/manpages/noble/man8/fsck.btrfs.8.html
- Ubuntu `fsck.ext4(8)` manpage: https://manpages.ubuntu.com/manpages/noble/man8/fsck.ext4.8.html
- Linux `fstab(5)` manpage: https://man7.org/linux/man-pages/man5/fstab.5.html
- Oracle Linux Btrfs conversion documentation: https://docs.oracle.com/en/operating-systems/oracle-linux/9/btrfs/btrfs-ConvertingaNonRootFileExtFileSystemtoaBtrfsFileSystem.html

## Issues Found
- Corrected the explanation of `ext2_saved`. The Btrfs documentation states that the original filesystem image is accessible as an `image` file inside the `ext2_saved` subvolume, not directly as the mounted contents of that subvolume.
- Corrected the rollback verification commands. Mounting `subvol=ext2_saved` only exposes the saved image file, so the post now loop-mounts `/mnt/ext2-saved/image` read-only as ext4 before listing the original filesystem contents.
- Corrected the limitation about hardlinks and deduplication. The original text incorrectly said ext4 hardlinks become separate copies. The post now states that separate files with identical contents are not automatically deduplicated and require out-of-band deduplication tooling.

## Review Notes
The commands and configuration snippets are otherwise consistent with current Btrfs and Ubuntu documentation. The post correctly sets the Btrfs `/etc/fstab` pass field to `0`, uses supported `btrfs-convert`, `btrfs filesystem`, `btrfs balance`, `btrfs scrub`, and compression options, and properly warns that backups are mandatory before conversion.
