# Validation Summary: How to View Service Logs with journalctl on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- systemd / systemd-journald
- journalctl CLI
- journald.conf configuration
- systemctl
- systemd-analyze
- syslog priority levels and facilities
- jq (for JSON processing)
- Ubuntu Linux

## Sources Consulted
- `journalctl(1)` man page (systemd project)
- `journald.conf(5)` man page (systemd project)
- `systemd.journal-fields(7)` man page
- `syslog(3)` man page for facility constants (LOG_KERN, LOG_USER, LOG_MAIL, LOG_DAEMON, LOG_AUTH, LOG_SYSLOG, etc.)
- `systemd-analyze(1)` man page
- systemd upstream documentation: https://www.freedesktop.org/software/systemd/man/journalctl.html
- systemd upstream documentation: https://www.freedesktop.org/software/systemd/man/journald.conf.html

## Issues Found
1. **Incorrect description of `SYSLOG_FACILITY=3`**: The original comment read "View only syslog messages" but facility 3 corresponds to `LOG_DAEMON` (system daemons without a separate facility value), not syslog. The actual "syslog" facility (`LOG_SYSLOG` — messages generated internally by syslogd) is facility 5. Updated the comment to: "View only messages from the daemon facility (facility 3)" to accurately reflect what the command does.

## Review Notes
- All journalctl flags and options verified against the current journalctl(1) man page: `-r`, `-f`, `-n`, `-u`, `-b`, `-k`, `-p`, `-o`, `--since`, `--until`, `--list-boots`, `--disk-usage`, `--rotate`, `--vacuum-time`, `--vacuum-size`, `--vacuum-files` are all correct.
- Syslog priority levels listed (emerg=0 through debug=7) match the values documented in syslog(3) and in the journalctl(1) `-p` option description.
- Priority range syntax `err..warning` (i.e., `FROM..TO`) is valid per the journalctl man page: "If a range is specified, all messages within the range are shown, including both the start and the end value of the range."
- Boot offset semantics (`-b -1` for previous boot) are correctly documented.
- Journal field matches (`_PID=`, `_EXE=`, `_UID=`, `SYSLOG_FACILITY=`) are valid journal fields per systemd.journal-fields(7).
- The `__REALTIME_TIMESTAMP` field is a valid journal address field used in JSON output.
- `journald.conf` settings (`Storage`, `SystemMaxUse`, `SystemMaxFileSize`, `SystemKeepFree`, `MaxRetentionSec`, `MaxLevelStore`, `MaxLevelSyslog`) all match the documented configuration directives.
- `systemd-analyze` subcommands (`blame`, `plot`, `critical-chain`) are valid.
- The boot ID example uses ellipsis (`7d5...`) as a placeholder, which is clearly marked with an inline comment — acceptable as illustrative.
- The post is well-organized and accurately reflects current systemd/journalctl behavior on Ubuntu.
