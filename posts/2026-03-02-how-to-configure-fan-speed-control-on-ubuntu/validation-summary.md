# Validation Summary: How to Configure Fan Speed Control on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- lm-sensors
- fancontrol
- pwmconfig
- Linux hwmon sysfs interfaces
- systemd-modules-load
- ipmitool / IPMI
- Dell iDRAC
- HP iLO
- Bash
- cron
- jq

## Sources Consulted
- Ubuntu fancontrol manpage: https://manpages.ubuntu.com/manpages/jammy/man8/fancontrol.8.html
- Ubuntu pwmconfig manpage: https://manpages.ubuntu.com/manpages/noble/man8/pwmconfig.8.html
- Ubuntu sensors-detect manpage: https://manpages.ubuntu.com/manpages/noble/man8/sensors-detect.8.html
- Ubuntu sensors manpage: https://manpages.ubuntu.com/manpages/noble/man1/sensors.1.html
- Linux kernel hwmon sysfs interface documentation: https://docs.kernel.org/hwmon/sysfs-interface.html
- Linux kernel dell-smm-hwmon documentation: https://docs.kernel.org/6.8/hwmon/dell-smm-hwmon.html
- Ubuntu ipmitool manpage: https://manpages.ubuntu.com/manpages/noble/man1/ipmitool.1.html
- Ubuntu systemd-modules-load manpage: https://manpages.ubuntu.com/manpages/jammy/man8/systemd-modules-load.8.html
- Dell iDRAC 8/7 thermal settings documentation: https://www.dell.com/support/manuals/en-us/poweredge-r730/idrac8_2.30.30.30_ug/modifying-thermal-settings-using-racadm
- HPE iLO IPMI User Guide: https://support.hpe.com/hpesc/public/api/document/c04530505

## Issues Found
- The manual `/etc/fancontrol` example used unsupported keys (`FCPWMS` and `FCSENSORS`) and omitted mandatory `FCTEMPS` and `MINSTART`. Replaced the unsupported keys with valid `FCTEMPS` mappings and added `MINSTART`.
- The `FCFANS` example listed fan input files without mapping them to PWM outputs. Updated it to the `pwm=fan_input` format expected by fancontrol.
- The `MINSTOP` comment incorrectly described a start threshold. Updated the comments and added bullets for `MINSTART` and `MINSTOP`.
- The module-loading command used `sudo service kmod start`, which is legacy and not the clearest current systemd command. Replaced it with `sudo systemctl restart systemd-modules-load.service`.
- The PWM enable comments described mode `2` too narrowly as firmware control. Updated the wording to reflect that automatic mode is driver-defined and hardware-specific.
- The Dell iDRAC IPMI section implied the raw commands work on all Dell servers. Updated the wording to state that these are undocumented OEM commands that only work on some PowerEdge models and iDRAC firmware versions.
- The Dell fan-control script used `jq` but did not install it. Updated the install command to include `jq`.
- The Dell script defaulted to `0` when it could not read CPU temperature, which could set fans to a low speed during an unsafe sensor failure. Changed it to re-enable automatic fan control and exit when the temperature is unavailable.

## Review Notes
The remaining examples still require users to substitute their own `/sys/class/hwmon/hwmonX` paths and sensor names. That is expected for lm-sensors and fancontrol because hwmon numbering and available attributes vary by hardware, kernel driver, and boot order.
