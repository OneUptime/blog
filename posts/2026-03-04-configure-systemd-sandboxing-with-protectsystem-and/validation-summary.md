# Validation Summary: How to Configure systemd Sandboxing with ProtectSystem and PrivateTmp on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd service units and drop-in configuration
- systemd sandboxing directives
- systemctl
- journalctl

## Sources Consulted
- systemd.exec(5), official systemd documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Red Hat Enterprise Linux 9 documentation, "Using systemd unit files to customize and optimize your system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_systemd_unit_files_to_customize_and_optimize_your_system/assembly_working-with-systemd-unit-files_working-with-systemd
- Red Hat Enterprise Linux 9 documentation, "Managing systemd": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Local systemd man page and CLI help output for systemd 255: systemd.exec(5), systemctl --help, journalctl --help

## Issues Found
- The service-management examples used `<service-name>` placeholders inside shell commands. If copied literally, shell redirection syntax would make those commands fail. Changed the commands to use `myapp.service`, matching the service used earlier in the post.
- The verification command used `grep -i <setting>`, which was not a runnable verification example. Replaced it with `systemctl show myapp.service -p ProtectSystem -p PrivateTmp -p ProtectHome -p NoNewPrivileges -p ReadWritePaths` so the configured properties are checked directly.
- The configuration allowed writes to `/var/lib/myapp` with `ReadWritePaths=`, but the example did not create that directory. Added `sudo mkdir -p /var/lib/myapp` before writing the drop-in configuration.

## Review Notes
The systemd sandboxing directive descriptions are accurate for RHEL 9-era systemd behavior. `ProtectSystem=strict` makes the filesystem hierarchy read-only except API filesystem subtrees and paths explicitly made writable, while `PrivateTmp=yes` gives the service private `/tmp` and `/var/tmp` directories.
