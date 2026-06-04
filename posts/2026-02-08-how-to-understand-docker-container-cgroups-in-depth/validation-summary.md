# Validation Summary: How to Understand Docker Container Cgroups in Depth

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Linux cgroups v1 and v2
- Linux kernel cgroup controllers
- CPU, memory, I/O, cpuset, and PIDs resource controls
- Bash command-line examples

## Sources Consulted
- Docker Docs: Resource constraints - https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: Runtime metrics - https://docs.docker.com/engine/containers/runmetrics/
- Docker Docs: dockerd cgroup driver configuration - https://docs.docker.com/reference/cli/dockerd/
- Linux kernel documentation: Control Group v2 - https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- Local Docker CLI help and runtime checks using Docker Engine 29.4.2 on cgroups v2 with the systemd cgroup driver
- Local `man 7 cgroups` documentation

## Issues Found
- The post assumed Docker always uses `/sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope/` on cgroups v2. Docker documents that cgroups v2 paths differ between the `systemd` and `cgroupfs` cgroup drivers, so the examples now qualify the systemd path and derive the exact path from `/proc/<pid>/cgroup`.
- The monitoring and throttling scripts used `docker ps -q` short IDs to build systemd cgroup scope paths. Systemd scope names use the full container ID, so those snippets would skip or miss running containers. The scripts now derive `SCOPE` from the container init process PID.
- The post described `cgroup.controllers` as active controllers. In cgroups v2 this file lists available controllers, so the comment was corrected.
- The CPU section described CPU shares as a CPU limit mechanism. Docker documents CPU shares as a relative weight that is only enforced under CPU contention, so the wording now distinguishes hard CFS quota limits from CPU shares or weights.
- The v1/v2 path comparison only showed one Docker cgroup-driver layout. It now includes both cgroupfs and systemd driver examples for v1 and v2.
- The summary described all Docker cgroup controls as hard guarantees. This was narrowed to hard limits or accounting controls because CPU shares are soft relative weights.

## Review Notes
The examples are Linux-specific and primarily target cgroups v2. They are accurate for current Docker Engine behavior, but exact cgroup file availability can still vary by kernel configuration, enabled controllers, Docker cgroup driver, and host storage device names.
