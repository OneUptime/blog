# Validation Summary: How to Use blkdiscard for SSD Secure Erase on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- `blkdiscard` (util-linux)
- `hdparm` (ATA Secure Erase)
- `nvme-cli` (NVMe Format / Sanitize)
- `lsblk` (--discard option)
- `fstrim` and `fstrim.timer` (systemd)
- LVM (`vgchange`), mdadm, swap management
- Ubuntu

## Sources Consulted
- `blkdiscard(8)` man page (util-linux): https://man7.org/linux/man-pages/man8/blkdiscard.8.html
- util-linux source for blkdiscard (BLKSECDISCARD ioctl failure behavior)
- `nvme-format(1)` man page: https://manpages.debian.org/testing/nvme-cli/nvme-format.1.en.html
- `nvme-sanitize(1)` man page: https://manpages.debian.org/testing/nvme-cli/nvme-sanitize.1.en.html
- NVM Express Base Specification (Format NVM SES field, Sanitize SANACT field)
- `hdparm(8)` man page (security commands)
- `lsblk(8)` man page (--discard columns)
- `systemd` documentation for `fstrim.timer`

## Issues Found
1. **NVMe Format SES values reversed.** The post documented `ses=1` as "Cryptographic erase" and `ses=2` as "User data erase". Per the NVMe spec, `ses=1` is **User Data Erase** and `ses=2` is **Cryptographic Erase**. Swapped the comments to match the spec.
2. **NVMe Sanitize action mismatched the comment.** The post had `--sanact=4` labelled as "Block erase sanitize". Per the NVMe spec, `sanact=2` is Block Erase, `sanact=3` is Overwrite, and `sanact=4` is Crypto Erase. Changed the example to `--sanact=2` so it matches the "Block erase sanitize" comment, and added a brief note documenting the other action values. Also dropped the inaccurate "writes pattern" phrasing (only overwrite sanitize writes a pattern).
3. **Incorrect claim about `blkdiscard --secure` fallback.** The post stated `blkdiscard --secure` "falls back to a regular discard" when unsupported. The util-linux implementation calls `BLKSECDISCARD` and exits with an error (`BLKSECDISCARD ioctl failed`) when the device does not support it — no fallback occurs. Updated the sentence to describe the actual behavior.

## Review Notes
- The `od -x | grep -v "0000000 0000 0000 0000 0000"` verification heuristic in the decommissioning checklist is imperfect because `od` increments the offset on each line (and squashes runs of identical lines with `*`), so the pattern won't reliably match every all-zero line. It still functions as a rough sanity check, so left as written.
- The blog appropriately calls out the freeze/unfreeze workflow (suspend/resume or SATA hot-plug) and the limitations of TRIM vs. ATA Secure Erase vs. physical destruction.
- Modern guidance (NVMe 1.3+) generally prefers the Sanitize command over Format with SES when both are supported because Sanitize operates on all media including overprovisioning and unmapped LBAs. The post mentions this implicitly; could be expanded in a future revision.
- `hdparm` ATA Secure Erase is increasingly less relevant on consumer hardware (which is now mostly NVMe), but remains accurate for SATA SSDs.
