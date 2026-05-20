# Validation Summary: How to Configure systemd RestartSec and WatchdogSec on Ubuntu

## Status
validated

## Post Type
Tutorial / System administration guide

## Technologies Covered
- Ubuntu
- systemd service units
- systemd restart policies
- systemd start rate limiting
- systemd watchdog notifications
- Bash
- Python
- Node.js

## Sources Consulted
- systemd.service(5), official freedesktop.org documentation: https://www.freedesktop.org/software/systemd/man/255/systemd.service.html
- systemd.unit(5), official freedesktop.org documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd-notify(1), official freedesktop.org documentation: https://www.freedesktop.org/software/systemd/man/systemd-notify.html
- Local Ubuntu systemd 255 man pages for systemd.service(5), systemd.unit(5), and systemd-notify(1)
- Ubuntu package metadata for systemd in Ubuntu 24.04 LTS: https://packages.ubuntu.com/noble/systemd

## Issues Found
- `StartLimitIntervalSec` and `StartLimitBurst` were shown under `[Service]` in the opening example. These are unit-level settings documented for `[Unit]`, so the example was corrected to place them under `[Unit]`.
- The `Restart=` option table described `on-failure` and `on-abnormal` too broadly as any signal. systemd distinguishes clean signals from unclean signals and also treats operation timeouts as failures for `on-failure`, so the table text was corrected.
- The `StartLimitAction` comment presented a partial value list as exhaustive. It was changed to "examples" because systemd supports additional action values depending on version.
- The start-limit behavior said manual intervention is required. systemd allows manual starts again after the interval has passed, and `systemctl reset-failed` clears counters immediately, so the wording was corrected.
- The exponential backoff wrapper read a backoff value but never slept, updated state, or implemented backoff. The script was replaced with a minimal working wrapper that sleeps according to the previous failure, forwards termination, records the next delay on failure, and clears the delay after a clean exit.
- The `RestartSteps` comment said the delay doubles each time. The official documentation says systemd increases the restart interval from `RestartSec` toward `RestartMaxDelaySec` over the configured number of steps, so the comment was corrected.
- The watchdog section used `sd_notify(STATUS=WATCHDOG=1)`, which is not the correct watchdog notification field. It was corrected to `sd_notify("WATCHDOG=1")`.
- The watchdog explanation said systemd always kills and restarts the service. systemd marks the service failed and terminates it on watchdog expiry, and automatic restart depends on `Restart=` being set to `on-failure`, `on-watchdog`, `on-abnormal`, or `always`; the text was corrected.
- The post said `Type=notify` is required for watchdog functionality. It is not strictly required for watchdog pings, but it is required if the service wants startup readiness gating through `READY=1`; the text was corrected.

## Review Notes
- The code snippets are illustrative and include placeholder functions such as `perform_work()` and `process_work()`, which is acceptable for a tutorial but should be replaced in a real service.
- The post correctly notes that Ubuntu 24.04 ships systemd 255, which supports `RestartSteps` and `RestartMaxDelaySec`.
