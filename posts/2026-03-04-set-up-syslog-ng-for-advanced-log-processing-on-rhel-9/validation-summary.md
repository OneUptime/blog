# Validation Summary: How to Set Up syslog-ng for Advanced Log Processing on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- syslog-ng Open Source Edition
- Fedora EPEL
- systemd
- journalctl
- dnf and RPM

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring basic system settings, logging services and journalctl usage: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index
- Red Hat Enterprise Linux 9 documentation: Configuring a remote logging solution with Rsyslog, for RHEL default logging context: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_configuring-a-remote-logging-solution_security-hardening
- syslog-ng OSE Administration Guide: Configuring syslog-ng on client hosts: https://syslog-ng.github.io/admin-guide/040_Quick-start_guide/000_Configuring_syslog-ng_on_client_hosts.html
- syslog-ng OSE Administration Guide: syslog-ng.conf manual page and configuration syntax: https://syslog-ng.github.io/admin-guide/190_The_syslog-ng_manual_pages/006_syslog-ng_conf
- syslog-ng OSE Administration Guide: Location of the syslog-ng configuration file: https://syslog-ng.github.io/admin-guide/050_The_configuration_file/000_Location_of_the_config_file.html
- syslog-ng OSE Administration Guide: Syntax checking with `--syntax-only`: https://syslog-ng.github.io/admin-guide/050_The_configuration_file/007_Managing_complex_syslog-ng_configurations/000_Including_config_files.html
- Fedora Packages: syslog-ng package in Fedora EPEL 9: https://packages.fedoraproject.org/pkgs/syslog-ng/syslog-ng/epel-9.html
- Red Hat blog: Installing EPEL on RHEL and CentOS Stream: https://www.redhat.com/en/blog/install-epel-linux

## Issues Found
- The post was missing the installation step despite saying it covered setup from installation to verification. Added a minimal syslog-ng installation step for RHEL 9 using CodeReady Linux Builder and EPEL, then installing the `syslog-ng` package.
- The prerequisites included CentOS Stream 9, but there were no CentOS Stream-specific EPEL commands. Added CRB, `epel-release`, and `epel-next-release` commands for CentOS Stream 9.
- The configuration path used a placeholder, `/etc/<service>/config.conf`, which is not a syslog-ng configuration file. Replaced it with `/etc/syslog-ng/syslog-ng.conf`, the typical path for native Linux packages.
- The post referenced generic "listening addresses, authentication settings, and logging options" rather than syslog-ng configuration concepts. Updated this to sources, filters, destinations, and log paths.
- The configuration section did not include a usable syslog-ng snippet. Added a minimal valid syslog-ng example using `system()`, `internal()`, a file destination, and a log path.
- The service management commands used `<service-name>` placeholders. Replaced them with the `syslog-ng` systemd unit name.
- The troubleshooting package check used `<package-name>`. Replaced it with `syslog-ng`.
- Added `syslog-ng --syntax-only` before restarting the service so users can validate the configuration before applying it.

## Review Notes
RHEL 9's default supported logging stack is based on `systemd-journald` and `rsyslog`; syslog-ng is available through EPEL rather than the default RHEL repositories. For production RHEL systems, teams should evaluate support implications before relying on EPEL packages.
