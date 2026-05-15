# Validation Summary: How to Monitor Storage Health with SMART and smartctl on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- smartmontools
- smartctl
- smartd
- SMART disk health monitoring
- ATA/SATA, SCSI/SAS, and NVMe storage health data
- Bash scripting
- systemd and journalctl

## Sources Consulted
- smartmontools project documentation and source documentation: https://www.smartmontools.org/static/doxygen/
- smartctl(8) man page mirror for command behavior and options: https://man.he.net/man8/smartctl
- smartd.conf(5) man page for DEVICESCAN and monitoring directives: https://man.archlinux.org/man/smartd.conf.5.en
- Red Hat Enterprise Linux 9 Package Manifest confirming smartmontools availability: https://access.redhat.com/documentation/bn-in/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf
- CentOS Stream/RHEL-compatible smartmontools RPM file list confirming `/etc/smartmontools/smartd.conf`: https://www.rpmfind.net/linux/RPM/centos-stream/9/baseos/x86_64/smartmontools-7.2-9.el9.x86_64.html

## Issues Found
- The introduction overstated SMART's predictive ability by saying disks "do not fail without warning" and that SMART metrics "can predict failures." Updated this to say failures can be sudden, but many failures show warning signs and SMART can help identify failing devices before complete failure.
- The SSD attribute table treated `Wear_Leveling_Count` and `Media_Wearout_Indicator` as uniform across SSDs. Updated the wording to make clear these are vendor-specific and should be interpreted by normalized value, trend, or only when supported by the drive.
- The NVMe section said smartctl "uses a different format," but the command syntax is the same and the main difference in the example is the NVMe namespace device path and output fields. Updated the wording accordingly.

## Review Notes
The core commands and configuration examples are technically valid: `dnf install smartmontools`, `smartctl -i`, `-s on`, `-H`, `-A`, `-a`, `-t short`, `-t long`, and `-l selftest` match smartctl documentation. The `smartd.conf` directives `DEVICESCAN`, `-a`, `-o on`, `-S on`, `-n standby,q`, `-s`, `-W`, and `-m` are valid, and the schedule uses smartd's documented weekday numbering where `6` is Saturday. Email alerts require a working local mail setup or a configured smartd mail execution path, which is technically correct but could be expanded in a future post.
