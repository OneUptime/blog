# Validation Summary: How to Use GParted for Partition Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GParted (GNOME Partition Editor)
- parted (CLI)
- Linux partition tables: GPT, MBR (msdos)
- Filesystems: ext4, NTFS, FAT32, XFS, Btrfs, F2FS, HFS+, exFAT
- Ubuntu package management (apt-get)
- mkfs utilities (mkfs.ext4, mkfs.xfs, mkfs.ntfs)
- resize2fs, e2fsck
- dd, partclone (cloning tools)
- /etc/fstab, blkid, mount

## Sources Consulted
- GParted documentation: https://gparted.org/documentation.php
- GParted Live CD: https://gparted.org/livecd.php
- parted manual: https://www.gnu.org/software/parted/manual/parted.html
- Ubuntu package archive (apt-cache) for `exfat-fuse`, `exfatprogs`, `partclone`, `gparted`
- bash(1) man page — line continuation and comment handling rules
- partclone documentation: https://partclone.org/usage/partclone.php
- mkfs.ntfs / ntfs-3g documentation: https://www.tuxera.com/community/open-source-ntfs-3g/
- Linux kernel exFAT documentation (kernel 5.4+ native exFAT driver paired with `exfatprogs`)

## Issues Found

1. **Broken bash line continuation with inline comments** (filesystem-tools install block). The original snippet used `\` at the end of each line followed by an inline `# comment`. In bash, `\` is line continuation only when it is immediately followed by a newline. When followed by whitespace and `#`, the `\` escapes the space and the `#` starts a comment, terminating the command. I verified this by running the snippet locally — only the first package was installed and the rest were interpreted as separate (non-existent) commands. **Fix:** moved the per-package descriptions into a comment block above the command and kept the multi-line `\` continuation clean (no trailing comments).

2. **`exfat-fuse` is the legacy FUSE driver.** On modern Ubuntu (22.04 LTS and later) the kernel includes a native exFAT driver and the userspace tools are provided by `exfatprogs`. Both packages exist in the archive, but `exfatprogs` is the current recommended package and is what GParted uses when checking for exFAT support today. **Fix:** replaced `exfat-fuse` with `exfatprogs`.

## Review Notes
- The `parted ... --script mkpart primary ext4 0% 100%` syntax is technically correct on GPT — parted accepts `primary` as the partition *name* (not type) on GPT disks. The post does not explain this nuance, but it is not technically wrong.
- The boot/esp flag distinction: in parted, setting `boot` on a GPT disk is effectively equivalent to setting `esp`. The post documents them as separate flags, which matches what GParted's "Manage Flags" UI presents to users.
- `bs=64K` for `dd` is a reasonable block size on modern hardware. Note that `K` in GNU dd is 1024 bytes (binary), which is the documented behaviour.
- The GParted Live URL (https://gparted.org/livecd.php) is the canonical download page.
- `mkfs.ntfs` is provided by the `ntfs-3g` package (already covered in the filesystem-tools install block).
- `resize2fs /dev/sdb1 40G` resizes to 40 GiB (resize2fs uses binary units by default). Correct.
- GParted's flag changes via "Manage Flags" do apply immediately and do not enter the pending operations queue — this is correctly described.
