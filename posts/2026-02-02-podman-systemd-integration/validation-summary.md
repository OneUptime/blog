# Validation Summary: How to Use Podman with Systemd

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman (container runtime)
- systemd (service manager, unit files, timers, templates)
- Quadlet (declarative Podman/systemd integration)
- conmon (Podman container monitor)
- journald (logging)
- loginctl (linger / user session management)
- subuid / subgid (rootless containers, shadow-utils)
- nginx, PostgreSQL, Redis (example container workloads)

## Sources Consulted
- systemd.unit(5) — https://manpages.debian.org/testing/systemd/systemd.unit.5.en.html
- systemd.service(5) — https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd issue #23235 (shell substitution in ExecStart) — https://github.com/systemd/systemd/issues/23235
- podman generate systemd deprecation discussion — https://github.com/containers/podman/discussions/20218
- podman-container-inspect(1) — https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- podman --sdnotify option docs — https://docs.podman.io/en/latest/markdown/options/sdnotify.html
- Podman sdnotify issue #15029 — https://github.com/containers/podman/issues/15029
- sd_notify(3) — https://www.freedesktop.org/software/systemd/man/latest/sd_notify.html
- usermod(8) — https://man7.org/linux/man-pages/man8/usermod.8.html
- Quadlet docs — https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html

## Issues Found

1. **`StartLimitIntervalSec` / `StartLimitBurst` placed in wrong section.** In `monitored-app.service`, these directives were under `[Service]`. Per systemd.unit(5) they belong in `[Unit]` and are silently ignored when placed in `[Service]`. Moved them to `[Unit]`.

2. **`WatchdogSec=60` is non-functional with `--sdnotify=conmon`.** conmon sends `READY=1` once on container start but does not forward periodic `WATCHDOG=1` keepalives — only `--sdnotify=container` (with the application calling `sd_notify` itself) makes `WatchdogSec` meaningful. Removed the `WatchdogSec=60` line and its comment from the monitored-app example since it would have misled readers into thinking the watchdog was active. The health-check flags (`--health-cmd` etc.) already supplied in the same example provide the recovery behavior the section promises.

3. **Shell command substitution in `ExecStart` would never execute.** The `podman-update@.service` template had `ExecStart=/usr/bin/podman pull $(podman inspect --format='{{.ImageName}}' %i)`. systemd does not run ExecStart through a shell, so `$(...)` is passed as a literal argv element and the command fails with "Failed at step EXEC spawning $(podman...)". Rewrote to wrap in `/bin/bash -c '...'` so the substitution actually happens, and added a one-line comment explaining why the wrapper is required.

## Review Notes

- `podman generate systemd` is deprecated (since Podman 4.4) but still present in Podman 5.x; the post already steers readers toward Quadlet as the modern path, which is correct.
- The naming convention from `podman generate systemd --name web-server` produces `container-web-server.service` (a `container-` prefix on the unit name) while the container itself is `web-server`. The `podman-update@.service` template assumes `%i` matches both the container name and `%i.service` is the unit to restart. Users who follow the auto-generated naming verbatim will need to instantiate the timer as `podman-update@container-web-server.timer`, and the post's example does so — but the `podman inspect %i` call inside the template would then look for a container called `container-web-server`, which won't exist. Readers should either rename their container to match the service or adjust the template. Not corrected because fixing it cleanly would require either a labels-based approach (`podman auto-update`) or restructuring, which exceeds the scope of a technical-error fix.
- `:Z` SELinux relabel flags on volumes will fail on systems without SELinux (e.g., default Ubuntu). The blog text frames `:Z` as "SELinux relabeling" which is correct, but readers on Debian/Ubuntu will need to drop the suffix.
- `usermod --add-subuids` / `--add-subgids` require a shadow-utils build with subid support — present on modern Fedora/RHEL/Debian/Ubuntu, but older or embedded distros may need manual `/etc/subuid` and `/etc/subgid` edits.
- Quadlet `[Install]` line `WantedBy=multi-user.target default.target` is valid — systemd.unit(5) explicitly allows space-separated unit lists for `WantedBy=`.
