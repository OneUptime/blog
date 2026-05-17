# Validation Summary: How to Use systemd-run for Transient Service Execution on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- systemd / systemd-run (transient units)
- systemctl
- journalctl
- systemd resource control (CPUQuota, MemoryMax, MemoryHigh, MemorySwapMax, IOReadBandwidthMax, IOWriteBandwidthMax, IOWeight, TasksMax, Nice)
- systemd sandboxing (ProtectSystem, ProtectHome, PrivateTmp, PrivateNetwork, NoNewPrivileges, ReadWritePaths)
- systemd transient timers (OnActiveSec, OnCalendar, OnBootSec, OnUnitActiveSec)
- Ubuntu

## Sources Consulted
- systemd-run(1) — https://www.freedesktop.org/software/systemd/man/latest/systemd-run.html
- systemd-run(1) Ubuntu Noble manpage — https://manpages.ubuntu.com/manpages/noble/man1/systemd-run.1.html
- systemd.timer(5) — https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html
- systemd.resource-control(5) — https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
- systemd.exec(5) — https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- systemd NEWS / changelog — https://github.com/systemd/systemd/blob/main/NEWS

## Issues Found

1. **Inaccurate transient unit naming convention.** The post claimed transient units are named `run-PID.service` and used `run-12345.service` as the example status target. Modern systemd (v240+, including Ubuntu 22.04's v249 and 24.04's v255) uses `run-u<N>.service` where `<N>` is an internal counter, not a PID. Updated the example to `run-u123.service` and the explanatory sentence to describe `run-u<N>.service`.

2. **Missing markdown heading marker on "Resource Limits Without Unit Files".** The section header was missing the `##` prefix, breaking the document outline. Added `##`.

3. **Misleading `--on-unit-active` example.** The original example `systemd-run --on-unit-active="30min" --unit=postgresql -- /path/to/post-db-task.sh` with the comment "Run 30 minutes after a unit becomes active" implied the timer fires relative to the existing `postgresql` service. In reality, `--on-unit-active=` (which maps to `OnUnitActiveSec=` in systemd.timer(5)) is defined relative to the timer's own associated transient service unit — and `--unit=postgresql` would have attempted to name the transient unit `postgresql`, colliding with the actual service. Rewrote the example to use `--unit=periodic-check` with a comment that accurately describes the repeating-after-own-activation semantics.

4. **Imprecise `--collect` description.** The post stated that without `--collect`, units "remain in a 'failed' or 'inactive' state" and must be manually cleaned up. In actual systemd behavior, successful transient units are garbage-collected automatically once inactive; only failed units linger and need `systemctl reset-failed`. Rewrote the paragraph to reflect this distinction.

## Review Notes

- All other `systemd-run` flags used in the post (`--unit`, `--scope`, `--wait`, `--collect`, `--uid`, `--gid`, `--working-directory`, `--on-active`, `--on-calendar`, `--on-boot`, and the full `--property=` set covering CPU/memory/I/O/tasks/Nice/sandboxing) are valid and behave as described on Ubuntu 22.04+ (`--working-directory` was added in systemd v240, well before any currently supported Ubuntu LTS).
- `CPUQuota` values above 100% (e.g., `150%`) are explicitly supported per systemd.resource-control(5) for multi-core allotment — the post is correct on this.
- I/O bandwidth properties (`IOReadBandwidthMax`, `IOWriteBandwidthMax`, `IOWeight`) require cgroup v2 with the io controller, which is the default on modern Ubuntu, so the examples will work out of the box on supported releases.
- The post does not pin a specific Ubuntu version; everything in the corrected post should work on 22.04 LTS and 24.04 LTS.
