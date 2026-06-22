# Validation Summary: How to Manage Systemd Journal Size on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- systemd-journald (the systemd journal)
- `journalctl` CLI
- `/etc/systemd/journald.conf` configuration
- systemd timers and service units
- rsyslog / syslog forwarding
- Ubuntu (20.04 / 22.04 / 24.04)
- Bash scripting, `numfmt`, `jq`, `df`, `smartctl`, `fsck`

## Sources Consulted
- systemd `journald.conf(5)` man page — https://www.freedesktop.org/software/systemd/man/latest/journald.conf.html (verified `SystemMaxUse`, `SystemKeepFree`, `SystemMaxFileSize`, `SystemMaxFiles`, `Runtime*` variants, `MaxRetentionSec`, `Storage`, `Compress`, `RateLimit*`, `ForwardTo*`, `MaxLevelSyslog`)
- systemd `journalctl(1)` man page — https://www.freedesktop.org/software/systemd/man/latest/journalctl.html (verified `--disk-usage`, `--vacuum-size`, `--vacuum-time`, `--vacuum-files`, `--verify`, `--rotate`, `--header`, `--list-boots`, output formats)
- systemd `systemd.exec(5)` — per-service `LogRateLimitIntervalSec`/`LogRateLimitBurst` drop-in settings
- systemd `systemd.time(7)` — time span syntax for `MaxRetentionSec`
- `systemd-tmpfiles(8)` — persistent journal directory creation
- `numfmt(1)` (GNU coreutils) — `--from=iec` byte conversion

## Issues Found
1. **Incorrect description of `SystemMaxFiles`** (Size-Based Limits section). The comment described it as "Maximum disk space all journal files can use / Alternative to SystemMaxUse for more explicit control." Per `journald.conf(5)`, `SystemMaxFiles=` controls the **maximum number of individual journal files** to keep — not disk space (which is governed by `SystemMaxUse=`). Corrected the comment to "Maximum number of individual journal files to keep / Once exceeded, the oldest journal files are deleted."

2. **Broken byte calculation in the monitoring script** (Monitoring Journal Health section). The line `journalctl --disk-usage --output=json | jq '.size'` does not work: `journalctl --disk-usage` always prints a fixed human-readable sentence and ignores `--output=json`, so `jq` fails and `JOURNAL_BYTES` silently falls back to `0`. This means the 2GB size alert would never fire. Replaced it with a working approach that parses the human-readable value and converts it to bytes with `numfmt --from=iec`. Also extended the size-extraction regex to include the `T` (terabyte) suffix and tolerate a trailing `B`.

3. **Misleading `ls` comment** (Checking Current Journal Size section). The comment claimed `ls -lh /var/log/journal/*/` lists files "sorted by modification time," but `ls` sorts alphabetically by default (a `-t` flag would be needed). Removed the inaccurate "sorted by modification time" clause rather than alter the command.

## Review Notes
- All `journald.conf` directives, `journalctl` flags, vacuum options, and the systemd timer/service units are valid and current.
- The default rate-limit values cited (`RateLimitIntervalSec=30s`, `RateLimitBurst=10000`) match current systemd defaults.
- `Storage=auto` is correctly described as the default; on Ubuntu, `/var/log/journal/` ships present so journals are persistent by default.
- `MaxRetentionSec=2week` is valid (systemd time-span syntax accepts `week`/`w`); the listed unit suffixes are accurate.
- The per-service `LogRateLimitIntervalSec`/`LogRateLimitBurst` overrides via `systemctl edit` are valid `[Service]` settings.
- The journal directory permissions (`2755`, `root:systemd-journal`) match what `systemd-tmpfiles` sets up.
- Minor stylistic note (not changed): the post uses `cat file | grep` in a couple of places where `grep file` would suffice; this is a harmless idiom and left intact to preserve the author's style.
