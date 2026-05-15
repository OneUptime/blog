# Validation Summary: How to Search and Filter Logs with journalctl on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RHEL
- systemd-journald
- journalctl
- Linux logging
- Python JSON processing

## Sources Consulted
- systemd journalctl official manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd journal fields official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.journal-fields.html
- systemd time syntax official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.time.html
- Local `journalctl --help` output from systemd 255
- Local `man journalctl`, `man systemd.time`, and `man systemd.journal-fields` pages

## Issues Found
- The post described `journalctl -o cat` as "Catalog format (includes explanatory text)". In journalctl, `-o cat` prints only the message text without metadata; catalog explanations are enabled with `-x` / `--catalog`. Updated the comment to "Message text only (no metadata)".
- The syslog identifier section used `journalctl -t kernel` for kernel messages. The `-t` option filters `SYSLOG_IDENTIFIER`; kernel messages should be queried with `-k` / `--dmesg` or `_TRANSPORT=kernel`. Updated the example to use `journalctl -t sshd` as a daemon tag example.
- The advanced field filter example described `_SYSTEMD_UNIT=nginx.service` as filtering by "systemd unit type". It filters by the `_SYSTEMD_UNIT` field for a specific unit. Updated the comment to "Filter by systemd unit field".

## Review Notes
The remaining commands and examples align with journalctl's documented options, field matching behavior, priority levels, output formats, and systemd timestamp syntax. Some examples depend on services or persistent journal data existing on the target RHEL host.
