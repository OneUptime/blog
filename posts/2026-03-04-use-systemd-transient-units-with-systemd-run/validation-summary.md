# Validation Summary: How to Use systemd Transient Units with systemd-run on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- systemd
- systemd-run
- transient service units
- transient scope units
- transient timer units
- systemd resource control

## Sources Consulted
- systemd-run manual page: https://www.freedesktop.org/software/systemd/man/256/systemd-run.html
- systemd.unit manual page: https://www.freedesktop.org/software/systemd/man/256/systemd.unit.html
- systemd.timer manual page: https://www.freedesktop.org/software/systemd/man/256/systemd.timer.html
- systemd.resource-control manual page: https://www.freedesktop.org/software/systemd/man/256/systemd.resource-control.html
- Red Hat Enterprise Linux 8 documentation, "Using control groups version 1 with systemd": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/using-control-groups-version-1-with-systemd_managing-monitoring-and-updating-the-kernel
- Local `systemd-run --help` output and local `systemd-run(1)`, `systemd.unit(5)`, `systemd.timer(5)`, and `systemd.resource-control(5)` man pages.

## Issues Found
- The post said systemd garbage-collects a transient unit whenever the process exits and the unit is no longer referenced. This was too broad because failed transient units are normally retained until `systemctl reset-failed` or equivalent, unless `--collect` is used. I clarified that successful inactive transient units are garbage-collected automatically and that failed units can remain loaded.
- The `--on-calendar` example used `2026-03-04 22:00:00`, which is in the past as of the validation date, 2026-05-15. I changed it to `2026-06-01 22:00:00` so the example still demonstrates scheduling at a future specific time.

## Review Notes
The commands and options in the post match current `systemd-run` behavior and RHEL documentation for creating transient service, scope, and timer units. The examples that call scripts or binaries under `/usr/local/bin` assume those executables exist on the target host.
