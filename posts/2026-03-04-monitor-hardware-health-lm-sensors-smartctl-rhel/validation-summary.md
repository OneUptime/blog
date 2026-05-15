# Validation Summary: How to Monitor Hardware Health with lm_sensors and smartctl on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- lm_sensors
- sensors and sensors-detect
- smartmontools
- smartctl
- smartd and smartd.conf
- SMART disk health monitoring
- NVMe health reporting
- Bash scripting

## Sources Consulted
- smartctl man page via ManKier: https://www.mankier.com/8/smartctl
- smartd.conf man page via Arch Linux manual pages: https://man.archlinux.org/man/smartd.conf.5.en
- smartd man page for CentOS/RHEL path behavior: https://www.unix.com/man-page/centos/8/smartd
- Red Hat Customer Portal smartd log examples showing `/etc/smartmontools/smartd.conf` and `/usr/libexec/smartmontools/smartdnotify`: https://access.redhat.com/solutions/7050502
- sensors man page via ManKier: https://www.mankier.com/1/sensors
- sensors-detect man page via ManKier: https://www.mankier.com/8/sensors-detect
- Red Hat lm_sensors technical notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/6.4_technical_notes/lm_sensors
- Red Hat smartmontools technical notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/5/html/5.9_technical_notes/smartmontools

## Issues Found
- The SMART alerts section told readers to edit `/etc/smartd.conf`. On current RHEL-family smartmontools packages, the default smartd configuration file is `/etc/smartmontools/smartd.conf`. Updated the command to use the RHEL path.
- The health check script filtered `smartctl -H` output with `grep "result"`, which works for common ATA-style output but can miss SCSI/SAS output such as `SMART Health Status: OK`. Updated the filter to `grep -E "result|SMART Health Status"` so the script reports both formats.

## Review Notes
The core commands and options reviewed are valid: `dnf install`, `sensors-detect`, `sensors`, `sensors -u`, `sensors -j`, `systemctl enable --now smartd`, `smartctl -i`, `smartctl -s on`, `smartctl -H`, `smartctl -A`, `smartctl -t short`, `smartctl -t long`, `smartctl -l selftest`, and the `DEVICESCAN` smartd directives are supported. Hardware support and exact output vary by disk protocol, controller, enclosure, and RHEL/smartmontools version.
