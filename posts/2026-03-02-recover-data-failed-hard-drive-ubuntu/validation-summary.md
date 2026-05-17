# Validation Summary: How to Recover Data from a Failed Hard Drive on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- smartmontools (`smartctl`)
- GNU ddrescue (`gddrescue` package)
- `losetup` (loop device management)
- `partprobe`
- `fsck.ext4` / e2fsprogs
- `ntfs-3g` / `ntfsfix`
- TestDisk
- PhotoRec
- foremost
- extundelete
- Ubuntu apt package management

## Sources Consulted
- GNU ddrescue manual and info documentation (https://www.gnu.org/software/ddrescue/manual/ddrescue_manual.html)
- `man losetup` (util-linux)
- `man smartctl` and smartmontools documentation (https://www.smartmontools.org/)
- TestDisk/PhotoRec CGSecurity wiki (https://www.cgsecurity.org/wiki/TestDisk, https://www.cgsecurity.org/wiki/PhotoRec)
- foremost manual (sourceforge.net/projects/foremost/)
- extundelete documentation (http://extundelete.sourceforge.net/)
- Ubuntu package archives (packages.ubuntu.com) — confirmed `extundelete`, `gddrescue`, `testdisk`, `foremost`, `ntfs-3g`, `smartmontools` are present in Ubuntu repositories
- ntfs-3g project documentation (https://github.com/tuxera/ntfs-3g)

## Issues Found

1. **Misuse of `losetup -f` in the "Working with the Disk Image" section.**
   The post originally ran `sudo losetup -f /mnt/recovery/disk.img` with the comment "Check the image with losetup", then immediately ran `sudo losetup /dev/loop0 /mnt/recovery/disk.img`. According to `man losetup`, `-f` with a file argument actually attaches the file to the first free loop device — it does not just "check". The second `losetup` invocation would therefore fail with "device or resource busy" (the file is already attached, and /dev/loop0 may already be in use).
   **Fix:** Replaced with `sudo losetup -f` (no file argument, prints the next free device name for inspection) followed by `sudo losetup -P /dev/loop0 /mnt/recovery/disk.img` to attach with partition scanning. The `-P` flag asks the kernel to create the partition device nodes (e.g., `/dev/loop0p1`) automatically, removing the need for the separate `partprobe` call that followed.

2. **Incorrect grep pattern in the `monitor_rescue.sh` script.**
   The script used `grep -c "^0x.*B"` to count bad sectors in the ddrescue mapfile. The ddrescue mapfile format uses single-character status codes at the end of each block entry: `+` (finished), `?` (non-tried), `*` (non-trimmed), `/` (non-scraped), `-` (bad-sector). There is no `B` status character, so the original pattern would always match zero lines.
   **Fix:** Changed pattern to `"^0x.*-$"` to correctly match lines whose status is `-` (bad-sector).

## Review Notes
- The ddrescue invocations are valid. The `-f` flag is technically only required when the output is a block device (per `man ddrescue`), so it is unnecessary when writing to a regular image file, but it is harmless. The `-d` (direct disc access via O_DIRECT) flag on the second pass is sensible for failing drives; arguably it would also be useful on the first pass, but this is a stylistic preference and not an error.
- The description of `-n` as "skips retrying bad sectors" is a slight simplification — strictly, `-n` skips the *scraping* phase (reading bad areas in smaller sub-block chunks). The high-level intent conveyed to the reader is accurate enough that no change was made.
- `extundelete` upstream has been unmaintained since 2013, but the package is still present in current Ubuntu universe repositories (verified `0.2.4-3build2`). The commands shown (`--inode 2`, `--restore-all`, `--restore-file`) are correct per its `--help` output. Readers on future Ubuntu releases where the package is dropped may need alternatives (e.g., `ext4magic`, `debugfs`), but this is not currently an inaccuracy.
- TestDisk and PhotoRec interactive menu instructions match the current upstream UI (TestDisk 7.x).
- foremost flag usage (`-t`, `-i`, `-o`) and the comma-separated type list are correct per the foremost man page.
- ntfsfix is correctly noted as part of the ntfs-3g package; its purpose (resetting the NTFS journal so Linux can mount, not a full chkdsk equivalent) is consistent with the post's framing.
- Professional clean-room recovery cost estimate ($500–$3000) is realistic for typical consumer drive recoveries.
