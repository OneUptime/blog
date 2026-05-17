# Validation Summary: How to Use hdparm for Disk Tuning on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- hdparm (CLI utility for ATA/SATA drives)
- Ubuntu (apt package manager, systemd)
- `/etc/hdparm.conf` configuration
- udev rules
- smartmontools / smartctl
- Linux block subsystem (`/sys/block`, NCQ queue depth)

## Sources Consulted
- `man hdparm` (hdparm 9.x, distributed with Ubuntu)
- hdparm upstream documentation (https://sourceforge.net/projects/hdparm/)
- hdparm.conf documentation (`man 5 hdparm.conf`)
- smartmontools documentation (https://www.smartmontools.org/)
- systemd-udev rules reference (https://www.freedesktop.org/software/systemd/man/udev.html) for `%N` substitution

## Issues Found

1. **`hdparm -H` mislabeled as "SMART health check".** Per `man hdparm`, `-H` reads temperature from some (mostly Hitachi) drives — it is not a SMART health command. hdparm does not have a built-in SMART health flag. **Fix:** removed the `hdparm -H` line and replaced it with `smartctl -H /dev/sda` (smartmontools), which is the actual SMART health check command. The detailed `smartctl -a` line was kept.

2. **`hdparm -S 0` listed as a way to "force drive to spin up from standby".** Per `man hdparm`, `-S` sets the standby (spindown) timeout; a value of `0` disables the automatic spindown, it does not actively spin the drive up. The correct way to wake a drive is to issue any disk read. **Fix:** removed the misleading `hdparm -S 0` line; kept the `dd` example which actually works and clarified the comment.

## Review Notes
- The `-d` flag's example output (`using_dma = 1 (on)`) is historically accurate but may not always appear on modern libata-managed SATA drives, where the ioctl can return `Inappropriate ioctl for device`. The post already qualifies this with "Modern systems use DMA by default", so it is left in.
- The `awk '{print $3 * 512 / 1024 " KB"}'` snippet processes both lines of `hdparm -a` output and prints a spurious `0 KB` for the device-name line. It is cosmetic, not technically wrong, and was left as-is.
- The `%N` substitution in the udev rule expands to the device node (e.g., `/dev/sda`) per the systemd-udev manpage — correct.
- APM value ranges, `-S` time encoding (units of 5 s, values 1–240), `-M` AAM range (128–254, 0 = off), and `/etc/hdparm.conf` field names (`write_cache`, `read_ahead_sect`, `apm`, `spindown_time`, `dma`) all verified against the official manpages.
- The post correctly notes that hdparm does not work with NVMe drives — confirmed.
