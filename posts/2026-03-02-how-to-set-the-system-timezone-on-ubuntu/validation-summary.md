# Validation Summary: How to Set the System Timezone on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu (16.04+)
- `timedatectl` (systemd)
- IANA timezone database / `tzdata`
- `/etc/timezone`, `/etc/localtime`, `/etc/adjtime`
- `dpkg-reconfigure`
- Docker (Ubuntu 22.04 image)
- `journalctl` (systemd-journald)
- `cron` (Debian/Vixie cron)
- PostgreSQL, MySQL, PHP, Java timezone configuration
- `hwclock`, `zdump`, `date`

## Sources Consulted
- systemd `timedatectl(1)` man page and `--help` output
- Debian/Ubuntu `crontab(5)` man page (current on Ubuntu)
- systemd `journalctl(1)` man page (`--utc`, `--since`, TZ env handling)
- GNU coreutils `date(1)` format specifiers (`%Z`, `%z`)
- `hwclock(8)` and `/etc/adjtime` documentation
- IANA tzdata zone naming conventions

## Issues Found
1. **Cron timezone section was technically incorrect.** The post claimed you could "prepend the timezone variable to the cron command" using `TZ=America/New_York 0 9 * * * /usr/local/bin/my-script.sh` to control when the job runs. This is wrong on two counts on Ubuntu's default cron (Debian/Vixie cron):
   - The `crontab(5)` man page explicitly states: "Even if a user specifies the TZ environment variable in his crontab this will affect only the commands executed in the crontab, not the execution of the crontab tasks themselves." So `TZ` does **not** change the schedule.
   - Environment variable assignments must be on their **own line** in Vixie cron — they cannot be combined with a schedule line.

   The post also presented `CRON_TZ=UTC` as a generic "per-crontab timezone declaration", which is misleading because Ubuntu's default cron does **not** support `CRON_TZ` for scheduling (that's a `cronie` feature on RHEL/Fedora). I rewrote this section to (a) put `TZ=` on its own line, (b) clarify that `TZ` only affects the command environment, not the schedule, (c) note that `CRON_TZ` is not supported by Ubuntu's default cron, and (d) show the recommended pattern (compute UTC, or have the script verify local time with `TZ=... date`).

## Review Notes
- The PHP example uses `/etc/php/8.1/cli/php.ini`. PHP 8.1 is older but still a plausible path; newer Ubuntu installs would use 8.2/8.3/8.4. Left as-is since it's clearly illustrative.
- The PostgreSQL config path `/etc/postgresql/14/main/postgresql.conf` is version-specific; readers will need to adjust the version number. Acceptable as an example.
- `timedatectl set-local-rtc 0` is correct (sets RTC to UTC). The corresponding `--adjust-system-clock` option exists if you want to also fix the system clock when toggling, but the post's usage is fine for the intended purpose.
- All other commands (`timedatectl`, `timedatectl list-timezones`, `timedatectl show --property=Timezone --value`, `journalctl --utc`, `zdump`, `hwclock --systohc`, `ln -sf`, `ln -snf`, `dpkg-reconfigure tzdata`, `date +%Z`/`+%z`) are accurate and current.
- The Docker example (`ENV TZ=...` plus `ln -snf` and `echo > /etc/timezone`) is the conventional pattern for Ubuntu-based images and works correctly.
- The claim that systemd-journald stores timestamps in UTC internally is correct.
