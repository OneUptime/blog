# Validation Summary: How to Restrict cron and at Access on Ubuntu

## Status
validated

## Post Type
Tutorial / Hardening guide

## Technologies Covered
- Ubuntu (cron daemon and the `crontab` user command)
- `at` / `atd` (one-time job scheduler)
- `/etc/cron.allow`, `/etc/cron.deny`, `/etc/at.allow`, `/etc/at.deny` access control files
- System cron directories (`/etc/cron.d`, `/etc/cron.daily`, `/etc/cron.weekly`, `/etc/cron.monthly`, `/etc/cron.hourly`)
- `/var/spool/cron/crontabs` spool directory
- `rsyslog` / `/var/log/syslog` for cron activity monitoring
- AppArmor (mentioned briefly as defense-in-depth)
- Bash scripting (audit loops, daily monitoring script)

## Sources Consulted
- Debian/Ubuntu `crontab(1)` and `crontab(5)` manual pages
- Debian/Ubuntu `at(1)` manual page
- CIS Ubuntu Linux Benchmark sections on cron/at hardening (recommended 600 permissions on `cron.allow`/`at.allow` and 700 on cron directories)
- Ubuntu cron package documentation (`/usr/share/doc/cron/`)
- GNU coreutils `date(1)` documentation (verified that the `+FORMAT` argument must be a single quoted argument)
- Verified empirically: `date +%b %_d %H` (unquoted) errors with "extra operand"; `date '+%b %_d %H'` works
- Verified empirically: March 2, 2026 is a Monday (matches the sample `at` output)

## Issues Found
1. **Audit loop printed crontab content before the user header.** The original snippet was:
   ```bash
   if sudo crontab -u "$user" -l 2>/dev/null | grep -v '^#' | grep -v '^$'; then
       echo "=== $user ==="
   fi
   ```
   Because the pipeline runs as the condition, the crontab lines are emitted by `grep` first and the `=== user ===` header only afterwards — the opposite of the intended labelled output. Rewrote it to capture the filtered content in a variable, check for non-empty, then print the header followed by the content.
2. **`date +%b %_d %H` was missing quotes around the format string.** The shell split this into three arguments to `date`, and `date` only accepts a single `+FORMAT` operand. The command errors with "date: extra operand `%_d`" and the `grep` ends up filtering on the bare month abbreviation (or nothing useful). Changed to `date '+%b %_d %H'` so the format string is one argument.

## Review Notes
- The post's recommendation of `chmod 600` on `/etc/cron.allow` / `/etc/at.allow` and `chmod 700` on the `/etc/cron.*` directories is aligned with CIS Ubuntu Benchmark hardening guidance and works in practice on Debian/Ubuntu (the cron daemon runs as root and can still read these files).
- The behaviour-when-neither-file-exists wording ("only root … on some systems … or everyone can … on others") is correctly described as implementation-dependent. On Debian/Ubuntu specifically, the shipped `/etc/cron.deny` is empty by default so all users can use crontab — readers may want to test on their distro.
- The example `at` output `"job 1 at Mon Mar  2 12:00:00 2026"` matches the actual `at` output format and the post's date (2026-03-02 is indeed a Monday).
- `/var/spool/cron/crontabs` is the correct path on Debian/Ubuntu (Red Hat-family systems use `/var/spool/cron/` directly without the `crontabs` subdirectory) — the post is consistent with Ubuntu throughout.
- The `aa-status`/AppArmor section is appropriately hedged: stock Ubuntu does not ship an AppArmor profile for cron, and the `cat … || echo "No cron AppArmor profile found"` pattern handles that gracefully.
- `/var/log/syslog` is still present on Ubuntu 22.04/24.04 by default via `rsyslog`, but readers on minimal cloud images that rely solely on `journald` may need `journalctl -u cron.service` instead. This is forward-looking and not a current correctness issue.
