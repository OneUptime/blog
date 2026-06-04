# Validation Summary: How to Use Docker with NUMA-Aware Memory Allocation

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Linux NUMA
- numactl and numastat
- Linux process NUMA maps
- Redis and PostgreSQL container examples
- sysbench memory benchmarking

## Sources Consulted
- Docker Docs: Running containers, including `--cpuset-cpus`, `--cpuset-mems`, and memory flags: https://docs.docker.com/engine/containers/run/
- Docker Docs: Docker daemon configuration overview and `/etc/docker/daemon.json`: https://docs.docker.com/engine/daemon/
- Docker Docs: `dockerd` CLI reference and supported daemon configuration options: https://docs.docker.com/reference/cli/dockerd/
- Compose Specification: service `cpuset`, `mem_limit`, `mem_reservation`, deploy resources, and obsolete top-level `version`: https://compose-spec.github.io/compose-spec/spec.html
- Linux man-pages: `numactl(8)` hardware and interleave options: https://man7.org/linux/man-pages/man8/numactl.8.html
- Local Docker CLI help for `docker run`, `docker create`, `docker compose config`, and `dockerd --validate`.

## Issues Found
- The post described NUMA distance values as if they were exact speed multipliers. Updated the wording to explain that NUMA distances are relative costs, not direct latency ratios.
- The Docker container pinning section claimed cross-node latency was eliminated. Updated the wording to say local memory placement reduces cross-node memory latency, which is more accurate.
- The Compose example used the obsolete top-level `version: "3.9"` field. Removed it because current Compose uses the latest implemented schema and treats `version` as obsolete.
- The post said `--cpuset-mems` can be configured through the Compose `deploy` section or Docker daemon configuration. Corrected this: Compose has `cpuset` for CPU placement, but no standard service field for Docker's `--cpuset-mems`, and `deploy.resources` controls CPU/memory limits rather than NUMA memory nodes.
- The daemon configuration example used invalid `default-cpus` and `default-mems` keys. Replaced that claim with a caveat that Docker does not provide daemon-wide defaults for NUMA CPU or memory placement, and kept only portable daemon configuration keys in the JSON example. Also removed the unrelated `cpu-rt-runtime` option because `dockerd --validate` warns that daemon-scoped real-time CPU settings are not implemented for cgroup v2.

## Review Notes
The remaining Docker CLI examples are syntactically valid for Docker Engine. `--cpuset-mems` is only effective on NUMA systems, and the benchmark/performance percentages remain workload-dependent guidance rather than a guaranteed result.
