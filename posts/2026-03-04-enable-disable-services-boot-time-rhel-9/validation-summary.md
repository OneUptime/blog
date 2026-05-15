# Validation Summary: How to Enable and Disable Services at Boot Time on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- systemd
- systemctl
- Linux service units and targets
- systemd preset policy

## Sources Consulted
- Red Hat Enterprise Linux documentation: Managing system services with systemctl: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/using_systemd_unit_files_to_customize_and_optimize_your_system/managing-system-services-with-systemctl
- Red Hat Enterprise Linux 8 documentation: Managing systemd: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- systemctl(1) manual page: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd.unit(5) manual page: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.preset(5) manual page: https://www.freedesktop.org/software/systemd/man/latest/systemd.preset.html
- Local systemctl/man-page verification for command syntax and exit-code behavior.

## Issues Found
- Corrected the `systemctl is-enabled` scripting guidance. The post originally said exit code 0 means enabled and non-zero means not enabled. The official `systemctl(1)` documentation shows that several states, including `static`, `alias`, and `indirect`, can also return exit code 0, so the example now checks for the exact `enabled` output.
- Clarified the `static` state. The post originally described static services as only started as dependencies. Static units cannot be enabled because they lack install information, but they can also be started manually, so the wording now reflects that.
- Clarified the `indirect` state based on `systemctl(1)`: it can involve `Also=`, aliases, or default instances, not just a generic indirect boot relationship.
- Corrected the `multi-user.target` description. It is the standard non-graphical multi-user target; networking is common in that mode but not the defining property of the target.

## Review Notes
The main enable, disable, `--now`, `list-unit-files`, `[Install]`, `WantedBy=`, and preset examples are technically correct for systemd-based RHEL systems. The `httpd` symlink path and LAMP service examples are plausible for RHEL packaging, though exact output can vary by installed package version, unit aliases, and local overrides.
