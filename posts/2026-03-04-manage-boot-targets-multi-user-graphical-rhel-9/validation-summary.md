# Validation Summary: How to Manage Boot Targets and Switch Multi-User/Graphical Mode on RHEL

## Status
validated

## Post Type
Tutorial / System administration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd targets
- systemctl
- GRUB kernel command-line target selection
- DNF package groups

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing systemd": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation, "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/
- systemctl(1) man page on local system
- systemd.special(7) man page on local system and upstream documentation: https://www.freedesktop.org/software/systemd/man/systemd.special.html
- systemd.target(5) man page on local system and upstream documentation: https://www.freedesktop.org/software/systemd/man/systemd.target.html
- runlevel(8) upstream documentation: https://www.freedesktop.org/software/systemd/man/runlevel.html

## Issues Found
No technical issues found.

## Review Notes
The commands and target descriptions align with Red Hat's RHEL 9 systemd documentation. Red Hat documents `systemctl rescue` as similar to `systemctl isolate rescue.target` but with a wall message to logged-in users; the post's `isolate rescue.target` command is still technically valid. The rescue and emergency descriptions match RHEL 9 documentation, with the usual caveat that exact service availability can depend on how far the boot process progressed before entering the target.
