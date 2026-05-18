# Validation Summary: How to Use anacron for Scheduling on Systems That Are Not Always On

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- anacron (and anacrontab format)
- cron / Ubuntu system cron directories (`/etc/cron.daily`, `/etc/cron.weekly`, `/etc/cron.monthly`)
- `/etc/anacrontab` configuration
- `/var/spool/anacron/` timestamp files
- systemd `anacron.timer` (Ubuntu integration)
- Bash scripting (backup and cleanup examples)
- `run-parts`, `tar`, `find`, `apt-get autoremove/autoclean`
- `journalctl` and syslog

## Sources Consulted
- anacron(8) man page (Debian/Ubuntu)
- anacrontab(5) man page (Debian/Ubuntu)
- `/etc/cron.d/anacron` (default Ubuntu install)
- `/lib/systemd/system/anacron.timer` and `anacron.service`
- `/usr/share/doc/anacron/README.Debian`
- Default `/etc/anacrontab` shipped with the Ubuntu `anacron` package

## Issues Found

1. **Incorrect description of `anacron -n -s` as a "test mode".**
   The original post showed:
   ```bash
   # Test mode - show what would run without actually running it
   sudo anacron -n -s
   ```
   This is wrong. `-n` ("now") actually **runs** the jobs immediately, ignoring the configured delays (and implies `-s`). It is not a dry-run. The correct way to validate an anacrontab without running anything is `anacron -T`, which tests the file's syntax. The example was replaced with `sudo anacron -T` and an accurate comment.

2. **Inaccurate description of the `-d` flag.**
   The original post described `-d` as "Debug mode (verbose output)". The anacron(8) man page actually defines `-d` as "Don't fork to the background. In this mode, anacron will output informational messages to standard error, as well as to syslog." Updated the flag description to reflect the man page wording, and also added `-T` and `-u` to the flag list for completeness.

3. **Inaccurate description of Ubuntu's anacron/cron integration.**
   The original post claimed `/etc/crontab` on Ubuntu has an entry like `07 6 * * * root anacron -s`. That is not how the Ubuntu package wires anacron up. On Ubuntu:
   - `/etc/crontab` contains conditional entries (`test -x /usr/sbin/anacron || ...`) that only run the periodic directories when anacron is **absent**.
   - When anacron is installed, it is started by `/etc/cron.d/anacron` on non-systemd systems or by the `anacron.timer` systemd unit (`/lib/systemd/system/anacron.timer`), which fires hourly during the daytime with a small random delay and uses `Persistent=true` to catch up after downtime.
   The "Combining anacron with cron" section was rewritten to reflect this.

## Review Notes
- The `@monthly` macro is the only supported period name in anacrontab; the post correctly only uses `@monthly` (not `@yearly` etc.).
- The example default `/etc/anacrontab` is a simplified version of what ships on Ubuntu — real installs may include `RANDOM_DELAY` and `START_HOURS_RANGE` variables, but the simplification is acceptable and does not change correctness.
- The hardcoded example timestamp `20260302` matches the post's publish date and is fine as illustrative output.
- The `find /tmp -mtime +7 -delete` example is a common pattern but on a real system it can race with services that recreate files in `/tmp`; this is a stylistic concern outside the scope of technical correctness.
- The journalctl + grep pattern (`journalctl | grep anacron`) works but `journalctl _COMM=anacron` would be slightly more efficient; not a correctness issue.
