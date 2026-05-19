# Validation Summary: How to Create systemd Device Units on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- systemd device units
- udev rules and device properties
- systemctl, udevadm, systemd-escape, systemd-analyze
- Linux block, serial, network, and PCI devices
- Bash backup script

## Sources Consulted
- systemd.device(5), freedesktop.org: https://www.freedesktop.org/software/systemd/man/systemd.device.html
- systemd.unit(5), freedesktop.org: https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- udev(7), freedesktop.org: https://www.freedesktop.org/software/systemd/man/udev.html
- systemd-escape(1), freedesktop.org: https://www.freedesktop.org/software/systemd/man/systemd-escape.html
- systemctl(1), freedesktop.org: https://www.freedesktop.org/software/systemd/man/systemctl.html
- Local Ubuntu systemd 255 command help and man pages for `systemctl`, `udevadm`, `systemd.device`, `systemd.unit`, and `udev`.

## Issues Found
- The post said device units are not created by writing unit files. systemd documentation allows `.device` unit files with common `[Unit]` and `[Install]` settings, although device units are normally created dynamically from the udev database. Updated the wording to reflect that nuance.
- The `udevadm test /sys/bus/usb/devices/1-1.2` example claimed it could test without a real device. `udevadm test` requires an existing sysfs path. Changed the example to derive the sysfs path from `/dev/ttyUSB0`, which tests without unplugging and replugging the device.
- The USB backup example identified `/dev/sdb` as the filesystem source. Filesystem UUIDs are usually attached to a partition such as `/dev/sdb1`, so the command and later debugging examples were updated to use `/dev/sdb1`.
- The backup service used `After=media.mount`, but the script manually mounts `/media/backup-drive`; the corresponding mount unit would be `media-backup\x2ddrive.mount`, not `media.mount`. Replaced this with `BindsTo=` and `After=` on the stable UUID device unit.
- The backup service ran as `backup-user` while the script mounts a filesystem, creates `/media/backup-drive`, and writes to `/var/log`, which typically require root. Removed the `User=` directive so the system service can perform those operations as written.
- The backup service used `notify-send` from a system service, which generally lacks the desktop session environment needed for user notifications. Replaced it with `logger` so completion is recorded reliably by the system service.

## Review Notes
The main systemd and udev patterns are technically sound: `TAG+="systemd"`, `SYSTEMD_WANTS=`, `SYSTEMD_ALIAS=`, `BindsTo=`, `After=`, and `WantedBy=<device>.device` align with systemd documentation. The udev rule snippets were checked with `udevadm verify`; representative service syntax and escaped device unit names were checked with `systemd-analyze verify` and `systemd-escape`.
