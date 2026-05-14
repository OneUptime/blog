# Validation Summary: How to Run Transient Units with systemd-run on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd
- systemd-run
- transient service, scope, and timer units
- systemd resource control
- systemd sandboxing options
- journalctl and systemctl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Creating transient cgroups using systemd-run command": https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/monitoring_and_managing_system_status_and_performance/Red_Hat_Enterprise_Linux-9-Monitoring_and_managing_system_status_and_performance-en-US.pdf
- Red Hat Enterprise Linux 9 documentation, "Removing transient control groups": https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/monitoring_and_managing_system_status_and_performance/Red_Hat_Enterprise_Linux-9-Monitoring_and_managing_system_status_and_performance-en-US.pdf
- systemd-run(1) manual page: https://www.freedesktop.org/software/systemd/man/252/systemd-run.html
- systemd.resource-control(5) manual page: https://www.freedesktop.org/software/systemd/man/252/systemd.resource-control.html
- systemd.timer(5) manual page: https://www.freedesktop.org/software/systemd/man/252/systemd.timer.html
- systemd.time(7) manual page: https://www.freedesktop.org/software/systemd/man/252/systemd.time.html
- systemd.exec(5) manual page: https://www.freedesktop.org/software/systemd/man/252/systemd.exec.html
- systemd.unit(5) manual page for unit garbage collection and CollectMode.
- Local command output from systemd-run --help and systemd-analyze calendar.

## Issues Found
- The one-time calendar timer used `2026-03-05 02:00:00`, which is already in the past as of the validation date, 2026-05-14. `systemd-analyze calendar "2026-03-05 02:00:00"` reports `Next elapse: never`. Changed it to `2030-03-05 02:00:00` so the example remains a valid future one-time timer at validation time.

## Review Notes
- The resource-control properties `CPUQuota`, `MemoryMax`, `MemorySwapMax`, `IOWeight`, and `IOReadBandwidthMax` are valid for RHEL 9's default cgroups-v2 setup.
- The sandboxing properties shown are valid systemd execution-environment options. Some sandboxing behavior depends on kernel namespace support and whether the unit runs in the system or user service manager.
- `--collect` maps to `CollectMode=inactive-or-failed`, which is appropriate for transient units where failed unit state does not need to be retained.
