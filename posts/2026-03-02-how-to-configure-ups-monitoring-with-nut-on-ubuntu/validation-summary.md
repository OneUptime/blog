# Validation Summary: How to Configure UPS Monitoring with NUT (Network UPS Tools) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Network UPS Tools (NUT)
- NUT daemons and tools: upsd, upsmon, upsdrvctl, upsc, upscmd, upssched
- NUT configuration files: nut.conf, ups.conf, upsd.conf, upsd.users, upsmon.conf, upssched.conf
- systemd services and targets for Ubuntu NUT packages
- USB HID and SNMP UPS monitoring

## Sources Consulted
- Network UPS Tools upsmon manual: https://networkupstools.org/docs/man/upsmon.html
- Network UPS Tools upsmon.conf manual: https://networkupstools.org/docs/man/upsmon.conf.html
- Network UPS Tools upsd.users manual: https://networkupstools.org/docs/man/upsd.users.html
- Network UPS Tools upssched manual: https://networkupstools.org/docs/man/upssched.html
- Network UPS Tools upssched.conf manual: https://networkupstools.org/networkupstools-master.github.io/docs/man/upssched.conf.html
- Network UPS Tools upsdrvctl manual: https://networkupstools.org/docs/man/upsdrvctl.html
- Network UPS Tools upscmd manual: https://networkupstools.org/docs/man/upscmd.html
- Network UPS Tools usbhid-ups manual: https://networkupstools.org/docs/man/usbhid-ups.html
- Network UPS Tools snmp-ups manual: https://networkupstools.org/docs/man/snmp-ups.html
- Network UPS Tools ups.conf manual: https://networkupstools.org/docs/man/ups.conf.html
- Network UPS Tools Hardware Compatibility List: https://networkupstools.org/stable-hcl.html
- Ubuntu 24.04 nut.conf manpage for NUT 2.8.1: https://manpages.ubuntu.com/manpages/noble/man5/nut.conf.5.html
- Ubuntu package metadata for nut, nut-client, nut-server, and nut-snmp 2.8.1-3.1ubuntu2 via apt-cache
- Ubuntu package unit files from nut-server and nut-client 2.8.1-3.1ubuntu2 packages

## Issues Found
- The architecture overview named `hidups` for USB UPS devices. Updated it to `usbhid-ups`, which is the current USB HID driver documented by NUT.
- The examples used deprecated `master` and `slave` terminology in `upsd.users` and `upsmon.conf`. Updated them to the current `primary` and `secondary` roles used in NUT documentation.
- The `MONITOR` comments described the second field as a slave count. Corrected this to the NUT power value: the number of power supplies on the client system fed by that UPS.
- The client-server example used `MONITOR ... 0 ... slave` for remote clients. Changed this to `MONITOR ... 1 ... secondary` because a client powered by the UPS should use a nonzero power value; `0` is for notification-only monitoring when the UPS does not power that system.
- The `POWERDOWNFLAG` comment incorrectly described the setting as a PID file. Corrected it to identify the emergency shutdown flag file.
- The comments for `RBWARNTIME`, `HOSTSYNC`, and `FINALDELAY` were inaccurate. Updated them to match the documented meanings: replacement-battery warning interval, primary wait time for secondaries, and delay before running `SHUTDOWNCMD`.
- The `upscmd` test used an `admin` account that was not configured and a placeholder password that did not match the examples. Added an administrative `upsd.users` entry with `instcmds = all` and updated the command to use that password.
- The boot enable example referenced `nut-driver.service`, which is not present in the Ubuntu 24.04 NUT package. Replaced the three service enable commands with `sudo systemctl enable nut.target`, matching the packaged systemd target.

## Review Notes
- The Ubuntu package metadata confirms that `nut` depends on both `nut-client` and `nut-server`, so installing `nut nut-client` is redundant but not technically incorrect.
- The NUT `snmp-ups` configuration keys shown in the post are valid for SNMPv1, and `snmp_version = v1` remains accepted.
- The manual `upsdrvctl start` command is valid, but NUT documentation notes that systemd-managed driver instances can conflict with manual driver control. For a future revision, the startup section could distinguish first-time troubleshooting from normal systemd operation.
