# Validation Summary: How to Install and Configure Icinga2 Monitoring on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Icinga 2
- DNF
- systemd
- journalctl
- SELinux
- EPEL

## Sources Consulted
- Icinga 2 official RHEL installation documentation: https://icinga.com/docs/icinga-2/latest/doc/02-installation/06-RHEL/
- Icinga official getting started documentation: https://icinga.com/docs/get-started/latest/
- Red Hat Enterprise Linux 9 DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- systemd systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html

## Issues Found
- The original installation command used `<package-name>` as a placeholder, which would not install Icinga 2. Replaced it with the official Icinga repository setup, CodeReady Builder/EPEL setup, and `dnf install icinga2 nagios-plugins-all`.
- The prerequisites mentioned CentOS Stream 9, but the reviewed instructions target the official paid RHEL repository flow. Updated the prerequisites to RHEL 9 with a valid Red Hat subscription and an Icinga repository subscription.
- The configuration path `/etc/<service>/config.conf` was generic and incorrect for Icinga 2. Replaced it with `/etc/icinga2/icinga2.conf`.
- The service commands used `<service-name>` placeholders. Replaced them with the actual `icinga2` systemd service.
- The post did not include Icinga 2 configuration validation. Added `icinga2 daemon -C`, which is the official validation command.
- The troubleshooting commands used placeholders. Replaced them with Icinga-specific `journalctl` and RPM package checks.

## Review Notes
The post now covers a basic Icinga 2 service installation and validation on RHEL 9. A full production Icinga deployment usually also requires API users, Icinga Web, Icinga DB, Redis, database setup, firewall rules, and more detailed object configuration.
