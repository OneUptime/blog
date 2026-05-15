# Validation Summary: How to Configure Automatic Security Updates on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF
- dnf-automatic
- systemd timers
- dnf-plugins-core needs-restarting
- Postfix / SMTP notifications

## Sources Consulted
- Red Hat Enterprise Linux 9: Managing and monitoring security updates: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_and_monitoring_security_updates/managing_and_monitoring_security_updates
- Red Hat Enterprise Linux 9: Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- DNF Automatic documentation: https://dnf.readthedocs.io/en/stable/automatic.html
- DNF needs-restarting plugin documentation: https://dnf-plugins-core.readthedocs.io/en/latest/needs_restarting.html
- systemd.timer manual for RHEL 9 systemd: https://redhat-plumbers.github.io/systemd-rhel9/systemd.timer.html

## Issues Found
- The timer section described `dnf-automatic.timer` as "download and apply" and enabled it for automatic installation. Red Hat documents `dnf-automatic-install.timer` for automatic security update installation, while `dnf-automatic.timer` follows `/etc/dnf/automatic.conf`. Updated the timer list, enable/status/list-timers commands, and override path to use `dnf-automatic-install.timer`.
- The `download_updates = yes` comment incorrectly described package manager confirmations. Changed it to describe downloading updates before applying them.
- The DNF exclusion example used `exclude=` in `/etc/dnf/dnf.conf`. Red Hat documents `excludepkgs` for DNF exclusions. Updated the example to append `excludepkgs=kernel* postgresql*`.
- The reboot check examples used `needs-restarting -r` as a standalone command. RHEL 9 documentation uses the DNF plugin command form. Updated examples to `dnf needs-restarting --reboothint` and kept the documented exit code behavior.

## Review Notes
The post is now technically consistent with RHEL 9 and DNF Automatic documentation. DNF Automatic also supports built-in `reboot` and `reboot_command` options, so a future enhancement could mention those as an alternative to a separate reboot-check script.
