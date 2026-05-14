# Validation Summary: How to Set Up Template Units with systemd Instantiated Services on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd unit files
- systemd template and instantiated service units
- systemctl
- journalctl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing systemd": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation, "Using systemd unit files to customize and optimize your system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_systemd_unit_files_to_customize_and_optimize_your_system/using_systemd_unit_files_to_customize_and_optimize_your_system
- systemd.unit official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.service official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemctl official manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- journalctl official manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Local system man pages for systemd.unit, systemctl, and journalctl.

## Issues Found
- The post claimed to cover template units and instantiated services, but the examples used generic placeholders such as `<service-name>` instead of a template unit and instance name. Updated the examples to use `/etc/systemd/system/example-worker@.service` and `example-worker@alpha.service`, matching systemd's documented template naming model.
- The post said the guide covered initial installation, but no installation step was present or required for creating a template unit. Updated the introduction to say the guide covers unit file creation through verification.
- The configuration step referenced an arbitrary `/etc/<service>/config.conf` file, which is not how a systemd template unit is defined. Replaced it with a valid systemd unit file path and a minimal service unit using `%i` for the instance name.
- The post restarted a placeholder service after editing configuration. For a newly created or changed unit file, systemd must reload unit files with `systemctl daemon-reload`; updated the command accordingly.
- Verification used a placeholder `grep` command. Replaced it with `systemctl show example-worker@alpha.service -p ActiveState -p SubState`, which checks the instantiated unit's state directly.

## Review Notes
The article is now technically correct as a minimal example. A future improvement would be to add more real-world details such as `EnvironmentFile=`, `WorkingDirectory=`, or dependency examples, but those are not required for correctness.
