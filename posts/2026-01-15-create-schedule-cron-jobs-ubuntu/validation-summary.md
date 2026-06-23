# Validation Summary: How to Create and Schedule Cron Jobs on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Cron / crontab (Vixie cron on Ubuntu/Debian)
- Ubuntu / Debian system administration
- systemd (`cron.service`, `systemctl`, `journalctl`)
- Bash scripting
- `/etc/cron.d`, `/etc/cron.daily` (run-parts) system cron directories
- Supporting CLI tools referenced in examples: `mysqldump`, `pg_dump`, `find`, `apt`, `ntpdate`, `mail`, `df`

## Sources Consulted
- crontab(5) and cron(8) man pages (Debian/Ubuntu Vixie cron) — https://manpages.ubuntu.com/manpages/jammy/man5/crontab.5.html, https://manpages.ubuntu.com/manpages/jammy/man8/cron.8.html
- crontab(1) man page — https://manpages.ubuntu.com/manpages/jammy/man1/crontab.1.html
- Debian cron package documentation (`/etc/cron.d` username field, run-parts naming/executable rules)
- run-parts(8) man page — https://manpages.debian.org/run-parts
- Ubuntu Server documentation on cron / scheduling tasks
- systemd journalctl / systemctl documentation for the `cron` service

## Issues Found
- **Incorrect daemon name for Ubuntu (fixed).** The "Understanding Cron" section stated "Cron runs as a daemon (`crond`)" and listed "**crond**: The daemon that executes jobs". On Ubuntu/Debian the daemon and systemd service are named `cron` (`/usr/sbin/cron`, `cron.service`); `crond` is the Red Hat/Fedora/CentOS naming. This contradicted the rest of the post, which correctly uses `systemctl status cron` and `journalctl -u cron`. Updated the prose to name the daemon `cron` on Ubuntu/Debian (noting `crond` is the Red Hat equivalent) and corrected the component bullet to `cron` with a reference to `cron.service`.

## Review Notes
- The day-of-week field is documented as `(0 - 6) (Sunday = 0)`. This is a valid simplified representation; Vixie cron also accepts `7` for Sunday (both `0` and `7` map to Sunday). Not an error — left as-is.
- The `ntpdate pool.ntp.org` example is functionally correct, but `ntpdate` is deprecated on modern Ubuntu releases in favor of `systemd-timesyncd` (or `chrony`). It still works if installed; worth a future caveat but not a technical error.
- The `disk_check.sh` script is correct and functional. `read output` without `-r` and unquoted variable expansions would draw ShellCheck warnings (SC2162, SC2086), but the script behaves as described for typical `df -H` output.
- `/etc/cron.daily` scripts run via `run-parts`, which requires the executable bit (correctly noted) and filenames without dots/special characters — the chosen name `cleanup-temp` complies.
- The `/etc/cron.d/myapp-backup` example correctly includes the mandatory username field (`root`), which distinguishes system crontab format from user crontabs.
- Cron logging guidance (`/var/log/syslog`, `journalctl -u cron`) and the `cron.allow`/`cron.deny` access-control logic are accurate for Ubuntu.
- The closing recommendation to consider systemd timers as a modern alternative is sound.
