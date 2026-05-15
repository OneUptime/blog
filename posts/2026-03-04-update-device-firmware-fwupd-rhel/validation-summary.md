# Validation Summary: How to Update Device Firmware Using fwupd on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- fwupd
- fwupdmgr CLI
- Linux Vendor Firmware Service (LVFS)
- UEFI capsule firmware updates
- systemd services and timers

## Sources Consulted
- Red Hat Customer Portal: How to update device firmware using fwupd on RHEL system? https://access.redhat.com/solutions/5436071
- Red Hat Developer: Use fwupd to deploy Linux firmware updates and more https://developers.redhat.com/articles/2023/10/06/use-fwupd-deploy-linux-firmware-updates-and-more
- fwupd UEFI Capsule plugin documentation https://fwupd.github.io/libfwupdplugin/uefi-capsule-README.html
- fwupd Host Security ID specification https://fwupd.github.io/libfwupdplugin/hsi.html
- LVFS device listing https://fwupd.org/lvfs/devices/
- Local `fwupdmgr --help` output for command and option validation
- Local systemd unit metadata for `fwupd.service` and `fwupd-refresh.timer`

## Issues Found
- The install command used `dnf` generically for RHEL. This is correct for RHEL 8 and later, but RHEL 7 systems typically use `yum`. Updated the install block to identify `dnf` as the RHEL 8+ command and added the RHEL 7 `yum` alternative as a commented command.

## Review Notes
The remaining `fwupdmgr` commands and flags were validated against local CLI help and authoritative fwupd/Red Hat documentation. The LVFS URL is valid. On RHEL, LVFS may not be enabled by default and `fwupdmgr refresh` can prompt the user to enable the remote; the post's command remains correct.
