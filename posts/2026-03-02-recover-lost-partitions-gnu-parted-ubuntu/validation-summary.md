# Validation Summary: How to Recover Lost Partitions with GNU Parted on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GNU Parted
- TestDisk
- PhotoRec
- gpart
- fdisk (util-linux)
- sfdisk (util-linux)
- partx
- partprobe
- gdisk / sgdisk (GPT fdisk)
- blkid
- fsck.ext4
- MBR and GPT partition tables
- Ubuntu

## Sources Consulted
- fdisk(8) man page (util-linux) — verified `-u, --units` flag behavior
- sgdisk(8) man page (GPT fdisk) — verified `-b, --backup=file` and `-l, --load-backup=file` flags
- gdisk(8) man page — verified recovery & transformation menu commands (`r`, `b`, `d`, `w`)
- TestDisk official documentation (CGSecurity) — verified workflow and "D" marking for deleted partitions
- parted(8) reference — verified `mklabel msdos`, `mkpart`, `set N boot on` syntax
- partx(8) — verified `-s` (show) flag
- gpart(8) — verified scan behavior and offset output format
- sfdisk(8) — verified `-d` (dump) and restore-via-redirect syntax

## Issues Found
- **`fdisk -u` mislabeled as "expert mode"**: The comment "Start fdisk expert mode to see sector information" was inaccurate. The `-u` flag only sets display units to sectors (the default in modern fdisk). Expert mode is entered by pressing `x` from inside fdisk's interactive prompt. Updated the comment to accurately describe the `-u` flag and added a note about pressing `x` for expert mode.

## Review Notes
- The TestDisk Analyse output example shows partition labels `[sda1]` and `[sda2]` on a disk labeled `/dev/sdb`. The bracketed names are filesystem labels (volume labels), not device paths, so this is technically valid (a disk could have such labels), though it could mildly confuse readers. Left as-is since it is not incorrect.
- `sudo sfdisk -d /dev/sda > /backup/...` shell redirection runs in the user's shell, not as root. If `/backup` requires root write permission, this will fail. This is a well-known shell gotcha and the syntax shown matches common practice; users typically work around it with `tee` or running a root shell.
- `gpart` is an older tool that has not been updated significantly in years; it works for legacy MBR detection but is less reliable than TestDisk for modern filesystems. The post correctly positions TestDisk as the primary recommendation.
- `fdisk -u` accepts an optional argument (`=sectors` or `=cylinders`); used without an argument it defaults to sectors mode, so the command is valid.
- gdisk recovery menu `b` (use backup GPT header to rebuild main) and `d` (use main GPT header to rebuild backup) are documented correctly in the post.
- All other commands (sgdisk backup/restore, partprobe, partx -s, fsck.ext4 -n, dd for MBR backup, photorec, sfdisk dump/restore) are accurate.
