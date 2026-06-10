# Validation Summary: How to Configure Docker Resource Limits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker (CLI runtime flags, `docker run`, `docker stats`, `docker inspect`)
- Docker Compose (`deploy.resources.limits`, `deploy.resources.reservations`)
- Linux cgroups (v1 and v2)
- Memory management (`--memory`, `--memory-reservation`, `--memory-swap`)
- CPU management (`--cpus`, `--cpu-period`, `--cpu-quota`, `--cpu-shares`, `--cpuset-cpus`)
- Block I/O management (`--device-read-bps`, `--device-write-bps`, `--device-read-iops`, `--device-write-iops`, `--blkio-weight`)
- Mermaid diagrams for visualization

## Sources Consulted
- Docker docs: `docker run` reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker docs: Runtime options with Memory, CPUs, and GPUs - https://docs.docker.com/config/containers/resource_constraints/
- Docker docs: Compose file reference (deploy.resources) - https://docs.docker.com/compose/compose-file/deploy/#resources
- Docker docs: `docker inspect` reference - https://docs.docker.com/reference/cli/docker/inspect/
- Docker docs: `docker stats` reference - https://docs.docker.com/reference/cli/docker/container/stats/
- Linux kernel cgroups v2 documentation - https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- Moby project source: `api/types/container/hostconfig.go` (verified `HostConfig.Resources` embedded field for inspect templates)

## Issues Found

1. **CPU throttling cgroup path was cgroups v1 only**
   - The troubleshooting section showed `/sys/fs/cgroup/cpu/docker/<container_id>/cpu.stat`, which only exists on cgroups v1 systems. Most modern Linux distributions (Ubuntu 22.04+, Fedora 31+, Debian 11+) default to cgroups v2, where the unified hierarchy uses a different path (`/sys/fs/cgroup/system.slice/docker-<container_id>.scope/cpu.stat`).
   - **Fix:** Added the cgroups v2 path as the primary example (since it applies to most modern systems) and kept the cgroups v1 path with a comment indicating it's for older systems.

## Review Notes

- The technical content is otherwise accurate and well-aligned with Docker's official documentation.
- The `--memory-swap` semantics are correctly described: setting it equal to `--memory` disables swap, and the difference between them defines swap allowance.
- The `--cpus=1.5` ≡ `--cpu-period=100000 --cpu-quota=150000` equivalence matches the Docker docs.
- CPU shares default of 1024, range/default for `--blkio-weight` (10-1000, default 500), and exit code 137 for OOM kill are all correct.
- The `docker inspect --format='{{json .HostConfig.Resources}}'` template works because Go's `encoding/json` and `text/template` both expose embedded struct fields by their type name; `Resources` is an embedded field in `HostConfig` in the Docker engine source.
- The Docker Compose example uses `version: '3.8'`, which is technically deprecated in the modern Compose Specification (the `version` field is now informational/ignored) but remains widely used and still works. The `deploy.resources.limits`/`reservations` keys are now respected by `docker compose` (v2 plugin) outside of Swarm mode, so the example is functional for typical use.
- Mermaid diagram percentages for CPU shares (2048:1024:1024 → 50%:25%:25%) check out (2048/4096 = 50%, 1024/4096 = 25%).
- The cgroup v2 path included in the fix assumes the systemd cgroup driver (Docker's default on modern distros). Users on systems with the `cgroupfs` driver may see a slightly different path; this is a minor caveat worth noting in future revisions.
