# Validation Summary: How to Configure Btrfs RAID on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Btrfs
- btrfs-progs
- Btrfs RAID profiles
- Linux block devices and `/etc/fstab`
- cron and systemd timers

## Sources Consulted
- Btrfs `mkfs.btrfs(8)` documentation: https://btrfs.readthedocs.io/en/latest/mkfs.btrfs.html
- Btrfs `btrfs-device(8)` documentation: https://btrfs.readthedocs.io/en/latest/btrfs-device.html
- Btrfs `btrfs-filesystem(8)` documentation: https://btrfs.readthedocs.io/en/latest/btrfs-filesystem.html
- Btrfs `btrfs-scrub(8)` documentation: https://btrfs.readthedocs.io/en/latest/btrfs-scrub.html
- Btrfs `btrfs(5)` documentation, including RAID56 status and glossary: https://btrfs.readthedocs.io/en/stable/btrfs-man5.html
- Linux man-pages `btrfs-replace(8)`: https://www.man7.org/linux/man-pages/man8/btrfs-replace.8.html
- Debian/Ubuntu `btrfsmaintenance` package information for the `btrfs-scrub.timer` note.

## Issues Found
- The failed-device replacement example used `btrfs device remove`, `device add`, and balance as the primary replacement workflow. This is not the clearest or safest guidance for a failing-but-present device, so it was changed to `btrfs replace start <srcdev> <targetdev> <mountpoint>` with `btrfs replace status`.
- The physically absent device example used `sudo btrfs replace start -r /dev/sdx /mnt/data`, which is invalid because `btrfs replace start` requires a source device or device ID and a target device. It was corrected to mount degraded, identify the missing devid, and run `sudo btrfs replace start 1 /dev/sdx /mnt/data`.
- The `/etc/fstab` explanation overstated `nofail` by implying it handles missing RAID members. It was clarified that `nofail` prevents boot from stopping if the mount fails, but does not automatically perform degraded Btrfs recovery.
- The RAID10 failure-tolerance text used traditional fixed mirror-pair wording. It was adjusted to say RAID10 tolerates one drive failure and that additional failures depend on whether every block group still has a valid copy.
- The heading "Monitoring with btrfs-usage" was misleading because the command is `btrfs filesystem usage`, not a separate `btrfs-usage` tool. The heading was renamed to "Monitoring Space Usage".
- The `btrfs device stats` explanation overstated zero counters as proof of a healthy array. It was clarified that zero counters mean Btrfs has not recorded device-level errors and should still be paired with scrubs and disk health monitoring.

## Review Notes
The main setup, mount, scrub, balance, RAID profile conversion, and RAID5/6 caution guidance matched current Btrfs documentation. The cron scrub example is syntactically valid for root's crontab. The note about `btrfs-scrub.timer` is accurate when the `btrfsmaintenance` package is installed on Ubuntu-derived systems.
