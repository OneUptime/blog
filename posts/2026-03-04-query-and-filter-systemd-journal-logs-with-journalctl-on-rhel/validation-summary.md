# Validation Summary: How to Query and Filter systemd Journal Logs with journalctl on RHEL

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- systemd journal
- journalctl
- Linux logging and troubleshooting

## Sources Consulted
- Red Hat Enterprise Linux documentation: Troubleshooting problems by using log files, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_basic_system_settings/assembly_troubleshooting-problems-using-log-files_configuring-basic-system-settings
- systemd journalctl manual, https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd journal fields manual, https://www.freedesktop.org/software/systemd/man/latest/systemd.journal-fields.html
- systemd time syntax manual, https://www.freedesktop.org/software/systemd/man/latest/systemd.time.html
- Local `journalctl --help` output from systemd 255

## Issues Found
- The comment for `journalctl -p crit` said it showed only critical and emergency messages. The `--priority` option includes the specified priority and all more important priorities, so `crit` includes critical, alert, and emergency messages. Updated the comment to "critical messages and above."
- The "Filter by Process, User, or Group" section did not include a group example. Added `journalctl _GID=1000`, matching the documented `_GID=` trusted journal field.

## Review Notes
The remaining commands and options are valid for current `journalctl` usage and align with RHEL documentation and upstream systemd manuals. The examples use common service names and timestamps; users may need to adjust service names and IDs for their systems.
