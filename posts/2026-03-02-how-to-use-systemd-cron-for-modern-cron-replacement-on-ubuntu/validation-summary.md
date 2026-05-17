# Validation Summary: How to Use systemd-cron for Modern Cron Replacement on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- systemd-cron (Ubuntu package, v2.3.2)
- systemd timers (`OnCalendar`, `OnBootSec`, `OnUnitActiveSec`, etc.)
- systemd service units (`Type=oneshot`, `OnFailure=`, resource controls)
- systemd template units (`@.service` with `%I`, `%n` specifiers)
- `systemctl`, `systemd-analyze calendar`, `journalctl`
- Traditional cron (`/etc/crontab`, `/etc/cron.d/`, `crontab -l`)
- PostgreSQL backup tooling (`pg_dump`) in the example

## Sources Consulted
- systemd-cron upstream source v2.3.2: https://github.com/systemd-cron/systemd-cron/tree/v2.3.2/src/units
- systemd-cron `configure` script (generator install path): https://github.com/systemd-cron/systemd-cron/blob/v2.3.2/configure
- systemd.time(7): https://man7.org/linux/man-pages/man7/systemd.time.7.html
- systemd.timer(5): https://man7.org/linux/man-pages/man5/systemd.timer.5.html
- systemd.unit(5) (specifiers `%n`, `%N`, `%I`, etc.): https://man7.org/linux/man-pages/man5/systemd.unit.5.html
- Ubuntu `apt-cache show systemd-cron` (v2.3.2-1build1: `Provides: anacron, cron-daemon`, `Conflicts: anacron, cron-daemon`)
- Local verification with `systemd-analyze calendar` for the calendar expressions in the post

## Issues Found
- **`systemctl cat "cron-daily@.service"` does not exist.** systemd-cron v2.3.x (the version shipped in current Ubuntu) consolidated its units; `src/units/` ships only `cron-boot.{service,timer}`, `cron-mail@.service`, `cron-schedule.{service,target,timer}`, `cron-update.{path,service}`, `cron.target`, and `systemd-cron-cleaner.{service,timer}`. There is no `cron-daily@.service` template (older 1.x had `cron-daily.target`/`cron-daily.timer` but never a templated `cron-daily@.service`). Replaced the example with `systemctl cat cron.target`, which exists in all versions, and adjusted the inline comment accordingly.

## Review Notes
- I verified the calendar expressions locally with `systemd-analyze calendar`:
  - `0/6:00:00` normalizes to `*-*-* 00/6:00:00` and is accepted (every 6 hours starting at 00:00).
  - `*-1,4,7,10-1 00:00:00` normalizes to `*-01,04,07,10-01 00:00:00` (quarterly).
- Generator path `/usr/lib/systemd/system-generators/systemd-crontab-generator` is correct. systemd-cron's `configure` defaults to `${libdir}/systemd/system-generators`, and on Ubuntu `/lib` symlinks to `/usr/lib`, so the canonical modern form used in the post is valid.
- The package metadata claim "stops and disables cron/cron daemon automatically" is functionally correct, though the mechanism is the virtual `cron-daemon` package (systemd-cron `Provides: cron-daemon` and `Conflicts: cron-daemon`) rather than a direct conflict with the literal `cron` package name. Left as-is because the practical effect described to the reader is accurate.
- Having `Requires=db-backup.service` in the `[Unit]` section of `db-backup.timer` is redundant (systemd implicitly activates the matching `.service` when the timer fires) and is a mild anti-pattern, but it is not incorrect for a `Type=oneshot` service and the timer still behaves as the post describes. Left unchanged to stay within the "fix only what's wrong" scope.
- `OnFailure=service-failure-notify@%n.service` expands to `service-failure-notify@db-backup.service.service` (with `.service` appearing twice — once inside the instance name and once as the unit suffix). This looks odd but is the standard Arch-wiki idiom: the template's `%I` then yields the failing unit's full name (`db-backup.service`), which is exactly what the notification script needs to pass to `journalctl -u`. Functionally correct.
- "transient service units" / "transient timer units" terminology is slightly imprecise — units produced by a generator live in `/run/systemd/generator/` and are technically *generated* units rather than *transient* (D-Bus-created) units. Not corrected because the operational meaning conveyed to the reader is accurate.
