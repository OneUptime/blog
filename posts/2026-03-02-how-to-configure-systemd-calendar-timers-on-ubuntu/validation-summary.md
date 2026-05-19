# Validation Summary: How to Configure systemd Calendar Timers on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- systemd timer units
- systemd calendar expressions (`OnCalendar=`)
- `systemd-analyze calendar`
- `systemctl` and `journalctl`
- Certbot renewal automation

## Sources Consulted
- systemd.time manual: https://www.freedesktop.org/software/systemd/man/systemd.time.html
- systemd.timer manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html
- systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Local Ubuntu 24.04 systemd man pages and `systemd-analyze calendar` output (`systemd 255`)

## Issues Found
- The timezone example placed the IANA timezone before the date. Current systemd calendar syntax accepts the timezone at the end of the expression, so `OnCalendar=America/New_York 2026-*-* 08:00:00` was changed to `OnCalendar=2026-*-* 08:00:00 America/New_York`.
- The basic-format explanation said missing fields default to `*`. systemd's documented behavior is more specific: omitted date implies `*-*-*`, omitted time implies `00:00:00`, and omitted seconds imply `:00`. The explanation was corrected.
- The post said systemd does not directly support last-day-of-month scheduling. systemd supports `~` for this, so the workaround text was replaced with `OnCalendar=*-*~01 00:00:00`.
- The Certbot example used `--no-self-upgrade`, which is not present in current Certbot documentation. The obsolete flag was removed.
- The removal section described `systemctl reset-failed` as cleaning leftover runtime state. For persistent timer timestamp state, the documented command is `systemctl clean --what=state TIMER`. The cleanup command was added before deleting the unit files, and the `reset-failed` comment was narrowed to failed status cleanup.

## Review Notes
- Calendar expressions in the post were checked with `systemd-analyze calendar` on Ubuntu systemd 255 after the fixes.
- The Certbot service still reloads nginx via `ExecStartPost` after a successful `certbot renew` command, including the case where no certificate needed renewal. For future refinement, `certbot renew --deploy-hook "/bin/systemctl reload nginx"` would reload only after a successful renewal.
