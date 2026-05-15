# Validation Summary: How to Set the System Hostname with hostnamectl on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd `hostnamectl`
- systemd-hostnamed
- NetworkManager and `nmcli`
- `/etc/hostname`, `/etc/hosts`, and `/etc/machine-info`
- cloud-init hostname preservation
- Linux `hostname` and `getent` commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Changing a hostname": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_changing-a-hostname_configuring-and-managing-networking
- systemd `hostnamectl(1)` manual: https://www.freedesktop.org/software/systemd/man/latest/hostnamectl.html
- systemd `machine-info(5)` manual: https://www.freedesktop.org/software/systemd/man/latest/machine-info.html
- NetworkManager `nm-settings-nmcli` reference: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- cloud-init "Update hostname and FQDN" documentation: https://docs.cloud-init.io/en/latest/reference/yaml_examples/update_hostname.html
- Linux `hostname(1)` manual: https://man7.org/linux/man-pages/man1/hostname.1.html
- Local command/man-page checks: `hostnamectl --help`, `man hostnamectl`, `man NetworkManager.conf`, `man nm-settings-nmcli`, `man machine-info`, and `man hostname`

## Issues Found
- The post said `hostnamectl status` output shows all three hostname types. In practice it shows configured hostname fields and related metadata; transient and pretty hostnames may not appear if unset. Changed the wording to "can show" configured hostnames.
- The post said hostname changes take effect without a reboot. The kernel hostname is updated immediately, but Red Hat documents that services which read the hostname only at startup may need restart or users may need to re-login. Clarified this nuance.
- The hostname naming rules said the short hostname has a 64-character maximum and the FQDN has a 253-character maximum. systemd `hostnamectl` limits static and transient hostnames to 64 characters total on Linux, even though DNS allows longer names. Updated the bullets accordingly.
- The post said the pretty hostname has no character restrictions. systemd documents that pretty hostnames have little restrictions, not none. Updated the wording.
- The NetworkManager section implied DHCP can override a valid static hostname through NetworkManager. NetworkManager's `hostname-mode` controls transient hostname management, and NetworkManager skips hostname updates when a valid static hostname is set. Updated the description and command comment to refer to the transient hostname.

## Review Notes
The `/etc/hosts` examples and provisioning script are technically workable but intentionally simple. In production automation, use a config-management tool or a more precise parser/update strategy to avoid duplicate or overbroad edits in `/etc/hosts`.
