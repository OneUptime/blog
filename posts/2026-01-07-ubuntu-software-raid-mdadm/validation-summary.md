# Validation Summary: How to Configure Software RAID (mdadm) for Data Redundancy on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- mdadm (Linux Software RAID / MD driver)
- Ubuntu / Debian (systemd services and timers)
- RAID levels 0, 1, 5, 6, and 10
- parted / gdisk (GPT partitioning)
- ext4 / XFS filesystems (mkfs.ext4, mkfs.xfs, resize2fs, xfs_growfs)
- systemd units (mdmonitor.service, mdcheck_start.timer, mdcheck_continue.timer)
- Kernel sysfs/procfs tunables (/proc/mdstat, /sys/block/md*/md/*, dev.raid.speed_limit_*)

## Sources Consulted
- mdadm systemd unit (upstream): https://github.com/neilbrown/mdadm/blob/master/systemd/mdmonitor.service
- Ubuntu mdadm manpage: https://manpages.ubuntu.com/manpages/focal/man8/mdadm.8.html
- md(4) driver manpage: https://manpages.ubuntu.com/manpages/xenial/man4/md.4.html
- Debian/Ubuntu mdcheck timer discussion (default OnCalendar=Sun *-*-1..7 1:00:00): https://lists.debian.org/debian-user/2025/09/msg00284.html
- Ubuntu Community Help Wiki - Software RAID: https://help.ubuntu.com/community/Installation/SoftwareRAID

## Issues Found
1. **Incorrect systemd service name (`mdadm-monitor.service`).** In the "Setting Up Email Notifications" section the post used `sudo systemctl restart mdadm-monitor.service` and `sudo systemctl enable mdadm-monitor.service`. No such unit exists on Ubuntu/Debian; the RAID monitor daemon is provided by `mdmonitor.service` (which the post itself uses correctly in the later "Using mdmonitor" section). Fixed both lines to reference `mdmonitor.service`.

2. **Incorrect unit name in `journalctl` command.** The "Identifying Failed Disks" section used `sudo journalctl -u mdadm-monitor`. Changed to `sudo journalctl -u mdmonitor` to match the actual unit name.

3. **RAID 10 layout comment did not match the command.** The comment read `--layout=f2: far layout with 2 copies` while the command actually used `--layout=n2`. Updated the comment to `--layout=n2: near layout with 2 copies (alternatives: f2 for far, o2 for offset)` so the explanation matches the command shown.

4. **Misleading "Ubuntu Server Guide - Software RAID" link.** The URL pointed to `device-mapper-multipathing-introduction`, which is about multipathing, not software RAID. Replaced with the RAID-specific Ubuntu Community Help Wiki page (https://help.ubuntu.com/community/Installation/SoftwareRAID).

## Review Notes
- The RAID level comparison table (minimum disks, fault tolerance, storage efficiency) is accurate: RAID 5 min 3 disks / 1-disk tolerance, RAID 6 min 4 disks / 2-disk tolerance, RAID 10 min 4 disks.
- The ext4 tuning math is correct: stride = chunk_size / block_size (512KB / 4KB = 128), and stripe-width = stride × data disks (128 × 2 = 256 for a 2-disk RAID 0), consistent with mdadm's default 512K chunk.
- Kernel rebuild-speed defaults are correct (`dev.raid.speed_limit_min` = 1000 KB/s, `dev.raid.speed_limit_max` = 200000 KB/s).
- The `mdcheck_start.timer` default schedule ("first Sunday of each month") is correct; upstream/Debian default is `OnCalendar=Sun *-*-1..7 1:00:00`.
- Minor caveat (not changed): on Ubuntu, `mdmonitor.service` historically ships without an `[Install]` section, so `systemctl enable mdmonitor` may emit a warning or do nothing on some releases; the daemon is typically started automatically via udev when an array is present. This does not make the commands wrong, just occasionally a no-op.
- The `--assume-clean` recovery example and `--zero-superblock` warnings are appropriately flagged as destructive. All mdadm flags (`--create`, `--manage`, `--grow`, `--examine`, `--detail`, `--monitor`, `--assemble`) and their options are valid and current.
