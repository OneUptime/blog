# Validation Summary: How to Handle Daylight Saving Time Changes on Ubuntu

## Status
validated

## Post Type
Technical guide / system administration tutorial

## Technologies Covered
- Ubuntu
- systemd timedatectl
- systemd timers
- cron
- IANA timezone data / tzdata
- zdump
- Python zoneinfo
- systemd journal / journalctl
- rsyslog-style syslog timestamps
- PostgreSQL
- MySQL

## Sources Consulted
- Local Ubuntu/Debian `cron(8)` and `crontab(5)` man pages for cron scheduling and DST behavior.
- Local `timedatectl --help`, `zdump --help`, `journalctl --help`, and `systemd-analyze calendar` output for command syntax validation.
- systemd.timer documentation: https://www.freedesktop.org/software/systemd/man/252/systemd.timer.html
- systemd.time documentation: https://www.freedesktop.org/software/systemd/man/systemd.time.html
- journalctl documentation: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- PostgreSQL date/time type documentation: https://www.postgresql.org/docs/current/datatype-datetime.html
- MySQL Server Time Zone Support documentation: https://dev.mysql.com/doc/mysql/en/time-zone-support.html
- Linux crontab manual page for CRON_TZ behavior in cron variants: https://man7.org/linux/man-pages/man5/crontab.5.html

## Issues Found
- The post stated that a fixed-time Ubuntu cron job in the fall-back hour may run twice and that a fixed-time job in the spring-forward gap does not run. Ubuntu's standard cron has special handling for DST-sized clock changes: fixed-time jobs in the skipped interval are run soon after the change, and fixed-time jobs in the repeated interval are not re-run. Updated the cron explanation to distinguish Ubuntu's behavior from other cron implementations.
- The post recommended `CRON_TZ=UTC` for Ubuntu cron. Ubuntu's standard Debian cron handles tasks in a single daemon timezone and does not document `CRON_TZ` support, even though other cron variants support it. Replaced that option with setting the server timezone to UTC before editing the crontab.
- The post used 2:30 AM as a generic fall-back repeated time. The repeated local hour varies by timezone, and in America/New_York the repeated hour is 1 AM. Generalized the fallback language to "the repeated hour" and kept the syslog example aligned with 1:30 AM.
- The Python DST transition snippet used `pytz`, which is not part of the Python standard library and may not be installed by default on Ubuntu. It also detected changes only at local midnights. Replaced it with a standard-library `zoneinfo` version that scans UTC hours and prints the local transition hour.
- The UTC transition example was incorrect: `2026-03-08 07:00:00 UTC` in New York is already 3:00 AM EDT, not 2:00 AM EST, and a UTC server would display UTC rather than EST/EDT by default. Updated the example to use `TZ=America/New_York` and the correct instants immediately before and after the transition.
- The post said a UTC server's displayed wall-clock offset changes from EST to EDT. On a server configured to UTC, the system-displayed offset remains `+0000`; only local-time conversions in applications or reports shift. Corrected that explanation.

## Review Notes
The remaining commands and configuration examples are technically sound for current Ubuntu-style systems, with one operational caveat: the PostgreSQL config path shown uses version `14`, so administrators on newer Ubuntu releases may need to adjust that path to their installed PostgreSQL major version.
