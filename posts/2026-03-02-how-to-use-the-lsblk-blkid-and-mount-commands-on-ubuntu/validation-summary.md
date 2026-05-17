# Validation Summary: How to Use the lsblk, blkid, and mount Commands on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- `lsblk` (util-linux)
- `blkid` (util-linux)
- `mount` / `umount` (util-linux)
- `findmnt` (util-linux)
- `/etc/fstab` configuration
- `e2label` (e2fsprogs)
- `fdisk`, `mkfs.ext4`, `fuser`, `lsof`
- Linux block-device/sysfs/udev concepts

## Sources Consulted
- `man lsblk` (util-linux) — verified `-a`, `-f`, `-J`, `-p`, `-e`, `-b`, `-o` options
- `man blkid` (util-linux) — verified `-U`, `-L`, `-o value -s`, `-o export/udev/full`
- `man mount` (util-linux) — verified `-t`, `-o`, `-U`, `LABEL=` syntax, and that `defaults` expands to `rw, suid, dev, exec, auto, nouser, async`
- `man umount` — verified `-f` (intended for unreachable NFS) and `-l` (lazy)
- `man findmnt` — confirmed `--tree` flag exists ("enable tree format output if possible")
- `/proc/devices` — confirmed loop devices have major number 7, matching `lsblk -e 7`
- `man e2label`, `man fstab`, `man fuser`, `man lsof`

## Issues Found
Two minor inaccuracies were corrected:

1. **`lsblk -a` comment was misleading.** The post described `-a` as "Show all devices including empty ones (no mountpoint)". Per `man lsblk`, `-a` disables built-in filters and lists empty devices and RAM disks — it is unrelated to whether a device has a mountpoint. Updated the comment to match the documented behavior.

2. **`umount -f` comment was misleading.** The post described `-f` as "Force unmount (if device is busy)". Per `man umount`, `-f` is specifically intended for unreachable NFS systems; for a locally busy mount you would typically use `-l` (lazy) or kill the holding processes. Updated the comment to reflect the documented intent.

## Review Notes
- All other commands, flags, output formats, mount options, and the `/etc/fstab` field layout were verified against the util-linux man pages and are correct as written.
- The `defaults` expansion in fstab (`rw,suid,dev,exec,auto,nouser,async`) matches the official `mount(8)` documentation.
- The `lsblk` sample output is plausible (sr0 typically reports ~1024M when empty; loop major 7 is correct).
- `blkid` does work without root for cached entries, but probing fresh devices requires root, so "Most operations require root" is a fair characterization.
- The post avoids version-specific claims and should remain accurate across current Ubuntu LTS releases (20.04, 22.04, 24.04).
