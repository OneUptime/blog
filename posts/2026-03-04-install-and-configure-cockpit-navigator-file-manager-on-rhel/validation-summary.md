# Validation Summary: How to Install and Configure Cockpit-Navigator File Manager on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit web console
- Cockpit file manager add-on
- DNF
- systemd
- firewalld
- journalctl
- RPM

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing systems using the RHEL 9 web console, including installing and enabling `cockpit.socket`, opening the `cockpit` firewalld service, and installing the `cockpit-files` add-on: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_systems_using_the_rhel_9_web_console/index
- 45Drives Cockpit Navigator upstream README, used to verify that upstream Cockpit Navigator package instructions list EL7/EL8 packages rather than RHEL 9 package instructions: https://github.com/45Drives/cockpit-navigator
- 45Drives Cockpit Navigator releases, used to check current upstream release context: https://github.com/45Drives/cockpit-navigator/releases

## Issues Found
- The original installation command used the placeholder `sudo dnf install -y <package-name>`, which would not install a file manager on RHEL 9. Replaced it with `sudo dnf install -y cockpit cockpit-files`, matching Red Hat's documented RHEL 9 web console package and file manager add-on.
- The original service commands used placeholders such as `<service-name>` and implied that the file manager add-on has its own systemd service. Replaced these with `cockpit.socket`, which is the documented systemd unit for the RHEL web console.
- The original configuration section referenced a non-existent generic file path, `/etc/<service>/config.conf`, and generic settings that were not accurate for this installation. Replaced it with enabling the Cockpit socket and opening the documented `cockpit` firewalld service.
- The original verification and troubleshooting commands used placeholder service and package names. Replaced them with concrete `systemctl`, `journalctl`, and `rpm -q` commands for `cockpit.socket`, `cockpit`, and `cockpit-files`.
- The post title and description referred to Cockpit Navigator on RHEL 9, but Red Hat's documented RHEL 9 file manager add-on is `cockpit-files`. Updated the post wording to describe the Cockpit file manager for RHEL 9 accurately.

## Review Notes
The 45Drives Cockpit Navigator project remains an upstream Cockpit file browser, but its published installation examples document EL7 and EL8 package paths. For a RHEL 9 guide, `cockpit-files` is the supported package documented by Red Hat.
