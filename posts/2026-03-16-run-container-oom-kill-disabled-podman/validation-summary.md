# Validation Summary: How to Run a Container with OOM Kill Disabled in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- Linux cgroups v1 and v2
- Linux OOM killer
- Container memory, swap, PID, CPU, and restart limits

## Sources Consulted
- Podman `podman-run` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-container-inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Linux kernel cgroup v1 memory controller documentation: https://www.kernel.org/doc/html/v5.15/admin-guide/cgroup-v1/memory.html
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/v6.1/admin-guide/cgroup-v2.html

## Issues Found
- The memory-pressure examples wrote to `/tmp`, which is container storage and does not reliably demonstrate memory cgroup exhaustion. Changed those examples to write to `/dev/shm` and added explicit `--shm-size` values so the examples pressure memory instead of primarily writing to the container filesystem.
- The post stated that with OOM kill disabled, memory allocations fail with `ENOMEM`. Linux cgroup v1 documentation says tasks may hang or sleep in the memory cgroup OOM wait queue until memory is freed or the limit is relaxed. Updated the explanation and example comments accordingly.
- The post recommended setting `--memory-swap` equal to `--memory` to prevent swap usage. Current Podman documentation describes `--memory-swap` as the total memory plus swap limit and requires it to be larger than `--memory` when used. Updated examples to use larger total memory-plus-swap values and changed the summary guidance to recommend an explicit swap limit when needed.
- The `--oom-score-adj` example omitted Podman's rootless-mode caveat. Added a note that Podman may clamp negative values to the current user's `oom_score_adj` in rootless mode.
- The exhausted-memory example printed `$?` through an outer double-quoted shell string, which could be expanded before being passed into the container. Escaped the variable and captured the command exit code inside the container shell.

## Review Notes
Podman was not installed in the local review environment, so commands could not be executed directly. The review was performed against current official Podman documentation and Linux kernel cgroup documentation.
