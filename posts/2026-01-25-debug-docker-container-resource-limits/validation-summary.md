# Validation Summary: How to Debug Docker Container Resource Limits

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Compose
- Linux cgroups v1 and v2
- Prometheus alerting rules
- Mermaid diagrams
- YAML and Bash

## Sources Consulted
- Docker Docs: Resource constraints, https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: docker container run reference, https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: docker container update reference, https://docs.docker.com/reference/cli/docker/container/update/
- Docker Docs: docker container stats reference, https://docs.docker.com/reference/cli/docker/container/stats/
- Docker Docs: Compose Deploy Specification, https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Compose services reference, https://docs.docker.com/reference/compose-file/services/
- Linux Kernel Docs: cgroup v2, https://docs.kernel.org/admin-guide/cgroup-v2.html
- Linux Kernel Docs: cgroup v1 memory controller, https://docs.kernel.org/admin-guide/cgroup-v1/memory.html
- Linux Kernel Docs: CFS bandwidth control, https://docs.kernel.org/scheduler/sched-bwc.html
- Prometheus Docs: Alerting rules, https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Docs: Recording and alerting rules, https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

## Issues Found
- The cgroup v1 CPU throttling path used `/sys/fs/cgroup/cpu/cpu.stat`, which is not the common Docker cgroup v1 mount path on many systems. Changed the main command to `/sys/fs/cgroup/cpu,cpuacct/cpu.stat` and added that path to the diagnostic script fallback.
- The cgroup v2 CPU stats example did not mention that cgroup v2 reports throttled time as `throttled_usec`, while cgroup v1 uses `throttled_time` in nanoseconds. Added the cgroup v2 field-name caveat.
- The memory pressure commands only showed the cgroup v1 `memory.failcnt` file. Added the cgroup v2 `memory.events` command, which reports events such as OOM and OOM kills.
- The Prometheus alerting example used Docker Compose service labels as if they configured Prometheus alerts. Prometheus alerting is configured with alerting rule files, so the snippet was replaced with a valid Prometheus rules file example.

## Review Notes
Docker Compose `deploy.resources` is valid in the current Compose Deploy Specification, but deploy support is platform-dependent in the Compose Specification. For standalone Docker Compose deployments, verify behavior with the installed Compose implementation.
