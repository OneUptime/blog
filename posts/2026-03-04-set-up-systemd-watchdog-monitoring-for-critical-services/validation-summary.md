# Validation Summary: How to Set Up systemd Watchdog Monitoring for Critical Services on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- systemd service units
- systemd watchdogs
- systemd hardware watchdog configuration
- Python
- Bash
- C

## Sources Consulted
- systemd.service official manual: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd.unit official manual: https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- systemd-system.conf official manual: https://www.freedesktop.org/software/systemd/man/systemd-system.conf.html
- sd_notify official manual: https://www.freedesktop.org/software/systemd/man/sd_notify.html
- systemd-notify official manual: https://www.freedesktop.org/software/systemd/man/systemd-notify.html
- python-systemd upstream project: https://github.com/systemd/python-systemd
- Red Hat Enterprise Linux systemd service management documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/chap-managing_services_with_systemd

## Issues Found
- The post described the application API as `sd_notify("WATCHDOG=1")`. The C `sd_notify` function takes an `unset_environment` argument first, so the wording was corrected to `sd_notify(0, "WATCHDOG=1")` or an equivalent language binding.
- The Python example used the third-party `sdnotify` package and `pip install sdnotify`. For a RHEL-focused systemd tutorial, this was changed to the standard `python-systemd` binding with `from systemd.daemon import notify` and installation via `sudo dnf install python3-systemd`.
- The recovery-action snippet placed `StartLimitBurst=` and `StartLimitIntervalSec=` under `[Service]`. Current systemd documents these as unit start-rate limiting settings in `[Unit]`, so the snippet was corrected to put them under `[Unit]`.

## Review Notes
- `WatchdogSec=`, `Restart=on-watchdog`, `RestartSec=`, `WatchdogSignal=`, `RuntimeWatchdogSec=`, `RebootWatchdogSec=`, `systemd-notify`, and the `kill -STOP` watchdog test are technically consistent with systemd documentation.
- The examples use fixed 10-second notification intervals for a 30-second watchdog timeout. This is valid because it is more frequent than the documented timeout window, though production code can also read the `WATCHDOG_USEC` environment variable to adapt automatically.
