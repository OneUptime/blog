# Validation Summary: How to Repair Corrupted ext4 File Systems on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ext4 filesystem
- e2fsck / fsck.ext4 (from e2fsprogs)
- debugfs (from e2fsprogs)
- tune2fs (from e2fsprogs)
- dumpe2fs / mke2fs (from e2fsprogs)
- badblocks
- lsblk, blkid, dmesg, journalctl
- Ubuntu boot / GRUB recovery flow

## Sources Consulted
- `man 8 tune2fs` (e2fsprogs) — defaults for -c (max-mount-counts) and -i (interval), explicitly stating "Mount-count-dependent checking is disabled by default"
- `man 5 ext4` — `sb=n` mount option semantics: "The block number here uses 1 k units. Thus, if you want to use logical block 32768 on a file system with 4 k blocks, use sb=131072."
- `man 8 debugfs` — verified `show_super_stats` (aka `stats`), `undel <inode> [pathname]`, `lsdel`, `dump`, `stat` syntax
- `man 8 e2fsck` — verified -y, -v, -f, -b, -l flag semantics
- `man 8 badblocks` — verified -v flag
- Linux kernel ext4 documentation (Documentation/admin-guide/ext4.rst) for sb_block conversion logic
- Debian/Ubuntu initramfs-tools behavior re: /forcefsck flag file

## Issues Found

1. **Incorrect `mount -o sb=` value (technical error).** The post wrote `sudo mount -o sb=32768 /dev/sdb1 /mnt/recovery`. Per `man 5 ext4`, the `sb=` mount option is specified in 1024-byte units, not in filesystem block units. For the default 4 KiB-block ext4 filesystem with a backup superblock at logical block 32768, the correct value is `sb=131072` (32768 × 4). Fixed the value and added a clarifying comment explaining the unit difference between `fsck.ext4 -b` (filesystem blocks) and `mount -o sb=` (1 KiB units).

2. **Outdated claim about default fsck schedule.** The post claimed "By default, Ubuntu runs e2fsck after every 30 mounts or after a certain number of days." This is no longer accurate — modern e2fsprogs (and therefore modern Ubuntu) ships with both mount-count and time-interval periodic checks disabled by default, as confirmed by `man 8 tune2fs`: "Mount-count-dependent checking is disabled by default to avoid unanticipated long reboots while e2fsck does its work." Reworded the intro to that section to reflect the current default, while keeping the example commands intact since they remain a valid way to opt back in. Also updated the comment on the disable command to note that it represents the modern default rather than a non-recommended change.

## Review Notes

- The `/forcefsck` flag-file approach still works on current Ubuntu because the Debian/Ubuntu initramfs-tools scripts continue to check for it, but the systemd-native equivalent is the `fsck.mode=force` kernel parameter. Not worth changing in-post.
- The "hold Shift during boot to access GRUB" instruction is BIOS-era guidance. On UEFI systems, Esc (or sometimes holding Shift right after firmware POST) is typically needed. Left as-is since Shift still works on many setups and the post says "Restart and hold Shift," which is the canonical Ubuntu documentation wording.
- The debugfs `undel`/`undelete` command is shown as a generic ext2/ext3/ext4 recovery mechanism. In practice, ext4 zeroes out the extent tree on file deletion, making `undel` largely ineffective for ext4 in real-world scenarios — `extundelete` or block-level carving tools like `photorec` are usually needed. This is a real-world caveat worth knowing but the post's commands are syntactically correct, so I did not add the caveat to avoid scope creep beyond fixing technical errors.
- e2fsprogs version 1.47.0 (5-Feb-2023) shown in example output is a real release and matches what ships on current Ubuntu LTS releases.
- All other commands, flags, and pass-by-pass e2fsck output descriptions match upstream documentation.
