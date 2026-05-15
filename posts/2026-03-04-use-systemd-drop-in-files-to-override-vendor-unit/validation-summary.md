# Validation Summary: How to Use systemd Drop-In Files to Override Vendor Unit Configurations on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- systemd unit files and drop-in files
- systemctl
- journalctl
- Apache HTTP Server (`httpd`)

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Working with systemd unit files": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_systemd_unit_files_to_customize_and_optimize_your_system/assembly_working-with-systemd-unit-files_working-with-systemd
- Red Hat Enterprise Linux 9 documentation, "Managing systemd": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation, "Setting up the Apache HTTP web server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-apache-http-server_deploying-web-servers-and-reverse-proxies
- systemd.unit manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.service manual: https://www.freedesktop.org/software/systemd/man/249/systemd.service.html
- Local systemctl and journalctl help output for command and flag validation.

## Issues Found
- The commands target `httpd.service`, but the prerequisites did not state that the Apache HTTP Server package must be installed. Added an Apache HTTP Server prerequisite with `sudo dnf install httpd` because Red Hat's RHEL 9 Apache documentation requires installing the `httpd` package before managing the service.

## Review Notes
- The drop-in location `/etc/systemd/system/<unit>.d/`, vendor unit location `/usr/lib/systemd/system/`, `.conf` drop-in format, and need to run `systemctl daemon-reload` after unit file changes match Red Hat and systemd documentation.
- The `LimitNOFILE=`, `Restart=always`, and `RestartSec=5s` directives are valid in the `[Service]` section for service units.
- The verification commands use valid `systemctl cat`, `systemctl show -p`, and `journalctl` options.
