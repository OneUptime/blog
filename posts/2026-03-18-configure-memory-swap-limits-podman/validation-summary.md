# Validation Summary: How to Configure Memory Swap Limits for Podman Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux cgroups v1 and v2
- Container memory limits
- Container swap limits
- OOM monitoring
- Bash scripting with jq
- Java and Node.js runtime memory options

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-update` documentation: https://docs.podman.io/en/stable/markdown/podman-update.1.html
- Podman `podman-pod-create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `podman-stats` documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman `podman-events` documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman `podman-container-inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- Docker runtime metrics documentation for legacy cgroup v1 swap accounting context: https://docs.docker.com/engine/containers/runmetrics/

## Issues Found
- The cgroups v2 swap accounting check used `cat /sys/fs/cgroup/memory.swap.max`, but the kernel cgroup v2 documentation defines `memory.swap.max` on non-root cgroups. Changed the check to search for a `memory.swap.max` file under `/sys/fs/cgroup` and clarified that `swapaccount=1` is relevant to older cgroups v1 systems.
- The OOM monitoring script parsed Docker-style event fields (`.Actor.Attributes.name` and `.time`). Podman events JSON uses fields such as `.Name`, `.ID`, and `.Time`. Updated the script to use Podman event fields and to check `.State.OOMKilled` before emitting an OOM alert.
- The memory profiling script read `.[0].mem_limit` from `podman stats --format json`, but the documented Podman JSON output exposes `mem_usage` and `mem_percent`, not `mem_limit`. Updated the CSV header and output to use the documented `mem_usage` value, which already includes usage and limit.

## Review Notes
Podman was not installed in the local review environment, so CLI behavior was verified against official Podman documentation rather than local `--help` output. The post's main Podman flags and cgroup caveats are otherwise consistent with the official documentation reviewed.
