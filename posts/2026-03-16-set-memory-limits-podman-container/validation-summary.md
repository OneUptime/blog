# Validation Summary: How to Set Memory Limits for a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux cgroups
- Container memory limits
- Container swap limits
- Container runtime resource monitoring

## Sources Consulted
- Podman `run` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `update` official documentation: https://docs.podman.io/en/stable/markdown/podman-update.1.html
- Podman `stats` official documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html

## Issues Found
- The post showed `--memory-swap` equal to `--memory` as a no-swap configuration. Current Podman documentation says `--memory-swap` must be larger than `--memory`, except for `-1` to enable unlimited swap. I removed that example and table row, added the documented constraint, and updated practical examples where `--memory-swap` equaled `--memory`.
- The post described `--memory-swappiness 0` as disabling swap. Podman documents this flag as tuning swappiness, and it is only supported on cgroups v1 rootful systems. I changed the wording to "minimize swapping" and added the support caveat.
- The post did not mention that `--oom-kill-disable` is unsupported on cgroups v2 systems. I added that caveat.
- The cgroup stats fallback used `/proc/meminfo`, which reports general memory information rather than the container cgroup usage value. I changed the fallback to the cgroups v1 memory usage path.
- The memory-limit test wrote zeroes to a file, which does not reliably allocate process memory. I changed the test to allocate a 256 MB Python bytearray inside a 64 MB-limited container.

## Review Notes
Podman was not installed in the local environment, so command verification was performed against current official Podman documentation rather than local `--help` output.
