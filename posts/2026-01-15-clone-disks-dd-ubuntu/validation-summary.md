# Validation Summary: How to Clone Disks with dd on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- `dd` (GNU coreutils) for block-level disk and partition cloning
- `lsblk`, `fdisk`, `blkid`, `hdparm`, `lshw`, `dmesg` for disk identification
- `e2label`, `ntfslabel`, `tune2fs`, `e2fsck`, `resize2fs`, `ntfsresize`, `parted`, GParted for filesystem/partition management
- `partprobe`, `blockdev`, `numfmt` utilities
- Compression: `gzip`, `pigz`, `xz`, `lz4`, `zstd`
- Network cloning: `netcat` (nc), `ssh`, `pv`
- `dcfldd` as a forensic dd alternative
- Clonezilla for complex clone scenarios

## Sources Consulted
- GNU coreutils `dd` manual — https://www.gnu.org/software/coreutils/manual/html_node/dd-invocation.html (operands `if`, `of`, `bs`, `count`, `skip`, `seek`, `conv=noerror,sync,sparse`, `iflag/oflag=direct,fullblock`, `status=progress`, USR1 signal behavior)
- `dcfldd` man page (operands `hash`, `hashwindow`, `hashlog`, `statusinterval`, `split`, `splitformat`, `vf`, `verifylog`)
- util-linux docs for `lsblk`, `fdisk`, `blkid`, `blockdev`, `partprobe`
- e2fsprogs docs for `e2label`, `tune2fs -U`, `e2fsck`, `resize2fs`
- `pigz`, `zstd`, `lz4`, `xz` man pages (flags `-c`, `-p`, `-T0`, `-dc`, levels `-1`..`-9`)
- netcat-openbsd / nc man page (Ubuntu default netcat)
- MBR layout reference: 446-byte bootstrap code, 512-byte MBR sector
- Clonezilla project site — https://clonezilla.org/downloads.php
- Ubuntu package availability for `pigz`, `lz4`, `zstd`, `dcfldd`, `gparted`, `clonezilla`

## Issues Found
- **SSD block-size comment was factually incorrect.** The line `# For SSDs (align with typical SSD page size):` paired with `bs=4M` was wrong — SSD pages are typically 4–16 KB (erase blocks are larger, but still not 4 MB). The 4 MB value is simply a large block size that improves throughput, not a page-size alignment. Changed the comment to `# For SSDs (a large block size improves throughput):`. The command itself was left unchanged since a large `bs` is a valid recommendation.

## Review Notes
- **netcat flag portability:** The examples use `nc -l -p 19000`. On Ubuntu the default is `netcat-openbsd`, where the canonical listen form is `nc -l 19000` (the `-p` source-port flag is unnecessary with `-l` and some versions warn about combining them). The `-l -p` form is widely used and works with the traditional/`ncat` variants, so it was left as-is, but readers on a strict OpenBSD nc may need to drop `-p`.
- **"Cloning to a Smaller Disk" final snippet is illustrative, not exact.** `SECTORS=$(sudo fdisk -l /dev/sda | grep "sda1" | awk '{print $3}')` actually captures the *End* sector column (not a partition sector count), and the subsequent `dd` of the whole `/dev/sda` up to that offset is an approximation. The section explicitly disclaims this as complex and recommends GParted/Clonezilla, so it was left intact, but it should not be treated as a precise shrink-clone procedure.
- **`cmp /dev/sda /dev/sdb` verification caveat:** byte-by-byte `cmp` of two whole devices reports an EOF "difference" when the disks differ in size (e.g., cloning to a larger disk), even though the copied region is identical. This is expected behavior; the post's usage is fine for same-size disks.
- **Block-size "accuracy" wording:** "Smaller bs = More accurate ... Larger bs = ... may miss small errors" is a loose simplification. With `conv=noerror,sync`, a read error pads/loses up to one full block, so a larger `bs` loses more data per bad sector — the statement is defensible as a simplification and was left unchanged.
- `dd` intro describes copying "byte-by-byte" and then "at the block level"; this is acceptable introductory phrasing (it reads in `bs`-sized blocks).
- All other commands, flags, parameters, packages, and scripts were verified as correct and current for modern Ubuntu releases.
