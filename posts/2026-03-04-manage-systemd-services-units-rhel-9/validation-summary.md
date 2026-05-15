# Validation Summary: How to Manage systemd Services and Units on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd
- systemctl
- journalctl
- systemd unit files and service units
- systemd targets and dependencies

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing systemd - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation: Working with systemd unit files - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_systemd_unit_files_to_customize_and_optimize_your_system/assembly_working-with-systemd-unit-files_working-with-systemd
- systemctl(1) manual and `systemctl --help`
- journalctl(1) manual and `journalctl --help`
- systemd.unit(5) manual - https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.service(5) manual - https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.exec(5) manual
- systemd.special(7) manual - https://www.freedesktop.org/software/systemd/man/latest/systemd.special.html

## Issues Found
- The custom service example said `After=network.target` starts the service after "the network is available." The systemd documentation states that `network.target` is weakly defined and does not guarantee IP-level configuration or an online network; services that strictly need a configured network should use `network-online.target`. I changed the comment to say basic networking is initialized, not necessarily online.

## Review Notes
The commands, unit file locations, dependency directives, target mappings, masking behavior, drop-in override workflow, and journalctl troubleshooting examples are consistent with RHEL 9 documentation and systemd manual pages. A future enhancement could mention `network-online.target` for services that need a fully configured network connection, but the corrected example is technically accurate as written.
