# Validation Summary: How to Configure Boot Targets and Default Runlevels in RHEL with systemd

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd targets
- systemctl
- GRUB kernel command-line target selection
- Linux rescue and emergency modes

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing systemd" / "Booting into a target system state": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- `systemctl(1)` man page
- `systemd.special(7)` man page
- `systemd.target(5)` man page
- `bootup(7)` man page

## Issues Found
- The "Checking the Current and Default Target" example described `systemctl get-default` as showing the current target. That command returns the default boot target, so the comment was corrected and the active-target command was described as showing currently active targets.
- The dependency diagram showed `emergency.target` as depending on `sysinit.target`. In systemd, `emergency.target` is intentionally minimal and does not pull in other services or mounts, so the diagram was corrected to show it separately.
- The rescue-mode summary stated that the root filesystem is mounted read-write. RHEL documentation describes rescue mode as attempting to mount local file systems, while emergency mode mounts root read-only. The rescue-mode bullet was revised to avoid over-specifying the mount state beyond the normal system mount configuration.

## Review Notes
The remaining commands and explanations are consistent with RHEL 9 documentation and systemd man pages. Red Hat documents `systemctl rescue` as the preferred convenience command for entering rescue mode from a running system because it broadcasts a notice to logged-in users, but `systemctl isolate rescue.target` is also valid and matches the post's discussion of target isolation.
