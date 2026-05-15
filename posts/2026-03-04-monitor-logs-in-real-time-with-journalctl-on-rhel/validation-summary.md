# Validation Summary: How to Monitor Logs in Real Time with journalctl -f on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- systemd journal
- journalctl
- GNU grep
- GNU tail
- dnf
- multitail

## Sources Consulted
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Red Hat Enterprise Linux 8 documentation, "Troubleshooting problems by using log files": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_basic_system_settings/assembly_troubleshooting-problems-using-log-files_configuring-basic-system-settings
- GNU Coreutils tail manual: https://www.gnu.org/software/coreutils/tail
- Local `journalctl --help` and `man journalctl` output on a systemd-based Linux host
- Local `man grep` output for buffering-related behavior

## Issues Found
- Traditional RHEL log files such as `/var/log/audit/audit.log` and `/var/log/secure` are normally privileged files. Updated the `tail -f` and `multitail` examples in the traditional log file section to use `sudo` so the commands work as described for typical RHEL permissions.

## Review Notes
The `journalctl` examples use valid options: `-f`/`--follow`, `-u`/`--unit`, `-t`/`--identifier`, `-p`/`--priority`, `-k`/`--dmesg`, and the listed output modes are supported by systemd's `journalctl`. Multiple `-u` and `-t` filters are valid. The post is intentionally general to RHEL and does not depend on a specific RHEL major version.
