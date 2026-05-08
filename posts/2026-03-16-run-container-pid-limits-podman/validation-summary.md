# Validation Summary: How to Run a Container with PID Limits in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- Linux cgroups pids controller
- Container resource limits

## Sources Consulted
- Podman run manual: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman update manual: https://docs.podman.io/en/stable/markdown/podman-update.1.html
- Podman stats manual: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman pod stats manual: https://docs.podman.io/en/latest/markdown/podman-pod-stats.1.html
- Podman events manual: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman container inspect manual: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html

## Issues Found
- Alpine examples used `sleep infinity`, which is not portable for Alpine's default BusyBox `sleep`. Changed Alpine long-running examples to `sleep 1000000` so the commands work with the image as written.
- The pod section used `podman stats --filter pod=pid-pod`, but the official `podman stats` options do not include a pod filter. Changed the command to pass the two container names directly.
- The troubleshooting section suggested checking `podman events` for PID limit violations. Podman events documents container lifecycle/status events, while cgroup PID limit hit counts are exposed through `pids.events` and newer `pids.events.local`. Changed the example to read those cgroup files from the container.

## Review Notes
Podman was not installed in the review environment, so commands could not be executed locally. CLI flags, format placeholders, default PID limit behavior, and cgroup file behavior were verified against official Podman documentation and Linux kernel cgroup documentation.
