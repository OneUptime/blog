# Validation Summary: How to Troubleshoot Cron Jobs Not Running on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ubuntu (Debian-family Linux)
- Vixie cron / `cron` service
- systemd (`systemctl`, `journalctl`)
- Bash shell scripting
- syslog / rsyslog log files
- Cron access control (`/etc/cron.allow`, `/etc/cron.deny`)

## Sources Consulted
- Ubuntu manpages for `cron(8)`, `crontab(1)`, `crontab(5)` — https://manpages.ubuntu.com/manpages/jammy/en/man8/cron.8.html
- Ubuntu Server documentation: CronHowto — https://help.ubuntu.com/community/CronHowto
- Debian `cron` package documentation — https://packages.ubuntu.com/jammy/cron
- systemd `journalctl` manpage — https://www.freedesktop.org/software/systemd/man/journalctl.html
- Debian/Ubuntu `/etc/crontab` default contents (PATH defaults, SHELL defaults)

## Issues Found
No technical issues found. All claims verified:

- `cron` is the correct service/package name on Ubuntu (RHEL/CentOS uses `crond`).
- `sudo systemctl status|start|enable cron` are valid commands.
- The crontab format claim — 5 time fields + user (only for `/etc/crontab` and `/etc/cron.d/*`) + command — is accurate. Per-user crontabs (`crontab -e`) omit the user field.
- `%` in crontab commands is interpreted as a newline and must be escaped with `\%` — correct per `crontab(5)`.
- Cron requires a trailing newline in crontab files — correct, historical vixie cron behavior.
- Default cron `PATH=/usr/bin:/bin` matches the default in `/etc/crontab` on Ubuntu.
- Cron's default shell is `/bin/sh` unless `SHELL` is set — correct.
- Cron sets the working directory to the user's `HOME` — correct.
- `/etc/cron.allow` / `/etc/cron.deny` semantics described correctly (cron.allow takes precedence; if it exists, only listed users may use cron).
- The `env -i HOME=... LOGNAME=... PATH=... SHELL=/bin/sh` simulation is a reasonable approximation of cron's environment.
- The CMD log line format `(user) CMD (...)` matches actual vixie cron syslog output.
- Mail-on-output behavior is correctly described.
- The wrapper script is syntactically valid bash.

## Review Notes
- On newer Ubuntu releases (22.04+), `rsyslog` is no longer installed by default in some images, so `/var/log/syslog` may not exist and `grep CRON /var/log/syslog` will fail. The post does mention `journalctl -u cron` as an alternative, which works regardless.
- The `env -i` simulation omits `MAILTO`, which cron also sets, but this is a minor simplification and does not affect troubleshooting outcomes.
- The post does not mention that `/etc/cron.d/*` files also require a user field (same format as `/etc/crontab`), but the existing wording about `/etc/crontab` covers the common case.
