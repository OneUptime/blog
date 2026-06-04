# Validation Summary: How to Use Docker Update to Change Container Resources Live

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker CLI
- `docker update`
- Linux cgroups v1 and v2
- Container CPU, memory, swap, restart policy, PIDs, and block I/O constraints
- Docker Compose
- Bash scripting

## Sources Consulted
- Docker Docs: `docker container update` CLI reference - https://docs.docker.com/reference/cli/docker/container/update/
- Docker Docs: Resource constraints - https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: Runtime metrics and cgroups - https://docs.docker.com/engine/containers/runmetrics/
- Docker Docs: Deprecated Docker Engine features - https://docs.docker.com/engine/deprecated/
- Docker Docs: `docker compose up` CLI reference - https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Docs: `docker network` CLI reference - https://docs.docker.com/reference/cli/docker/network/
- Linux kernel documentation: cgroup v2 - https://docs.kernel.org/admin-guide/cgroup-v2.html
- Linux kernel documentation: CFS bandwidth control / cgroup v1 CPU quota files - https://www.kernel.org/doc/html/latest/scheduler/sched-bwc.html
- Local Docker CLI help: `docker update --help`, Docker client 29.4.2

## Issues Found
- The post listed kernel memory limit as a live-updatable Docker setting. This is outdated: Docker deprecated `--kernel-memory` in 20.10, removed Engine API support in 23.0, and Docker CLI 29.0 removes the option. Removed kernel memory from the updateable settings list and clarified the limitation.
- The "full list" of updateable settings omitted current `docker update` options such as block I/O weight, CPU real-time controls, and NUMA memory node pinning. Added those categories to match the current Docker CLI reference.
- The post said network connections require recreating the container. `docker update` cannot change network attachments, but Docker supports live network attach/detach through `docker network connect` and `docker network disconnect`. Updated the wording.
- A memory inspection example was described as human-readable megabytes, but the Docker inspect template prints raw byte values. Changed the wording and comment to describe the output accurately.
- The memory reservation explanation implied Docker itself reclaims memory back to the reservation level. Clarified that the kernel reclaims memory more aggressively from containers above their reservation under memory pressure.
- The cgroup CPU verification example only showed the cgroup v2 `cpu.max` file. Added cgroup v1 `cpu.cfs_quota_us` and `cpu.cfs_period_us` checks.
- The limitations section said Windows runtimes have different supported flags. Docker's `docker update` reference states the command is not supported for Windows containers, so the limitation was corrected.
- The automation script increased `--memory` without updating `--memory-swap`, which can fail when the previous memory+swap limit is below the new memory limit. Updated the script to set `--memory-swap` alongside the memory increase.

## Review Notes
The post is technically relevant and the corrected commands match current Docker CLI behavior. Docker cgroup behavior still has host-specific caveats, especially around cgroup v1 deprecation, swap accounting, rootless Docker, and kernel support for individual controllers.
