# Validation Summary: How to Create Full System Images with dd and Clonezilla on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- GNU coreutils dd
- gzip
- Zstandard/zstd
- zerofree
- Clonezilla Live
- Clonezilla Server / DRBL
- Linux loop devices and partition probing

## Sources Consulted
- GNU coreutils dd documentation/help: https://www.gnu.org/software/coreutils/dd
- Local `dd --help`, `gzip --help`, `zstd --help`, and `losetup --help` output
- Clonezilla Live `ocs-sr` command manpage: https://clonezilla.org/fine-print-live-doc.php?path=clonezilla-live%2Fdoc%2F98_ocs_related_command_manpages
- Clonezilla reserved image/device name examples for `ocs-sr`: https://clonezilla.org/advanced/reserved-word-ocs-sr.php
- Clonezilla Live download and SourceForge file listing: https://clonezilla.org/downloads.php and https://sourceforge.net/projects/clonezilla/files/clonezilla_live_stable/
- DRBL command documentation for `drbl-ocs`: https://drbl.org/management/
- zerofree man page: https://manpages.debian.org/testing/zerofree/zerofree.8.en.html

## Issues Found
- The post stated that Clonezilla copies only used blocks without qualification. Clonezilla does this for supported filesystems, while unsupported filesystems fall back to sector-by-sector copying. Updated the introduction, comparison table, Clonezilla workflow note, and wrap-up to clarify "supported filesystems."
- The `zerofree` comment said it was ext4-only. `zerofree` supports ext2, ext3, and ext4 filesystems, so the comment was corrected.
- The Clonezilla ISO download command used a SourceForge URL that returned 404 because it omitted the release directory and `/download` endpoint. Updated it to a verified SourceForge download URL for `clonezilla-live-3.3.1-35-amd64.iso`.
- The DRBL multicast example used `startdisk multicast_restoreparts` with a partition target. DRBL uses `startdisk`/`startparts` plus operations such as `save`, `restore`, and `multicast_restore`; the command was corrected to `startparts multicast_restore root-img-20260304 sda2`.

## Review Notes
The examples assume traditional disk names such as `/dev/sda`; on many RHEL 9 systems NVMe disks appear as `/dev/nvme0n1` and partitions as `/dev/nvme0n1p1`. The `dd`, compression, restore, and loop-mount examples are otherwise technically valid when run from an appropriate live/rescue environment against the correct devices.
