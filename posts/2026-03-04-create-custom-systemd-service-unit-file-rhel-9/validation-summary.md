# Validation Summary: How to Create a Custom systemd Service Unit File on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd service unit files
- systemctl
- Linux service users
- systemd sandboxing and resource control directives

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using systemd unit files to customize and optimize your system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_systemd_unit_files_to_customize_and_optimize_your_system/using_systemd_unit_files_to_customize_and_optimize_your_system
- systemd.service(5), official freedesktop.org manual: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd.unit(5), official freedesktop.org manual: https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- systemd.exec(5), official freedesktop.org manual: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemctl(1), official freedesktop.org manual: https://www.freedesktop.org/software/systemd/man/systemctl.html
- Local Linux man page for useradd(8), covering `--system`, `--shell`, and `--home-dir`.

## Issues Found
- The comment explaining `Requires=postgresql.service` said that if PostgreSQL fails, the custom service fails too. That was too broad. `Requires=` starts the required unit when this unit starts, prevents this unit from starting if the required unit fails to activate and an `After=` ordering dependency is present, and stops/restarts this unit when the required unit is explicitly stopped/restarted. It does not mean the required unit must always remain active while this service is running. Updated the comment to say that PostgreSQL is started too and this service is stopped if PostgreSQL is explicitly stopped.

## Review Notes
- The post recommends `Type=simple` for most modern applications. This is still valid and common, but current upstream systemd documentation recommends `Type=exec` for many long-running services when available because startup failures such as a missing binary or missing user are reported more accurately. RHEL 9 supports `Type=exec`, so this could be mentioned in a future expansion.
- `systemctl edit` reloads the systemd manager configuration after saving the drop-in. A later service restart is still needed for changed service settings to affect an already running service process.
