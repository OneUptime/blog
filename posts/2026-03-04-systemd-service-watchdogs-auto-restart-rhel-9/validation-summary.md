# Validation Summary: How to Set Up systemd Service Watchdogs and Auto-Restart Policies on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd service units
- systemd watchdog notifications
- systemd restart and start-rate limiting policies
- Python Unix datagram sockets

## Sources Consulted
- systemd.service(5), upstream official manual for systemd 252: https://www.freedesktop.org/software/systemd/man/252/systemd.service.html
- systemd.unit(5), upstream official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- Red Hat Enterprise Linux 9 documentation, Using systemd unit files to customize and optimize your system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_systemd_unit_files_to_customize_and_optimize_your_system/
- Local systemd-analyze verify output from systemd 255 for syntax checks.

## Issues Found
- `StartLimitBurst=` and `StartLimitIntervalSec=` were shown in the `[Service]` section. `StartLimitIntervalSec=` is a unit-level setting in current systemd and was ignored by `systemd-analyze verify` when placed under `[Service]`. Moved both settings to `[Unit]`.
- Drop-in examples wrote files under `/etc/systemd/system/myapp.service.d/` without first creating that directory. Added `sudo install -d /etc/systemd/system/myapp.service.d` before each drop-in `tee` command.
- The escalating restart example used `FailureAction=reboot-force` under `[Service]` to describe rebooting after restart attempts are exhausted. For rate-limit exhaustion, the documented unit-level directive is `StartLimitAction=`. Changed the example to use `[Unit]` and `StartLimitAction=reboot-force`.
- The restart-policy table described `Restart=always` as only "Any exit". Updated it to include exits, signals, timeouts, and watchdog failures. Tightened `on-abort` to "Unclean signal only".

## Review Notes
The Python example is syntactically valid and uses the documented notification socket protocol pattern, including abstract namespace socket handling. In production code, using `WATCHDOG_USEC` to derive the ping interval would make the example adapt automatically to future unit-file changes, but the fixed 10-second interval is valid for `WatchdogSec=30`.
