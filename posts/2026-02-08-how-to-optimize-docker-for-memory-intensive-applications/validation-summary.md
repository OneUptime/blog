# Validation Summary: How to Optimize Docker for Memory-Intensive Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Linux cgroups
- Linux kernel VM sysctls
- JVM container memory settings
- Python shared memory
- Redis
- PostgreSQL

## Sources Consulted
- Docker Docs: Resource constraints, memory, swap, swappiness, and OOM flags: https://docs.docker.com/engine/containers/resource_constraints/
- Docker CLI help for `docker run`, `docker inspect`, and `docker stats` on Docker 29.4.2
- Docker Docs: Compose Deploy Specification resources limits and reservations: https://docs.docker.com/reference/compose-file/deploy/
- Linux Kernel documentation for `/proc/sys/vm/`: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Official Postgres Docker image documentation: https://hub.docker.com/_/postgres
- Local validation with `docker compose config -q`

## Issues Found
- The `vfs_cache_pressure` section described the setting as direct page cache pressure. Updated it to accurately state that it controls reclaim of directory and inode caches relative to page cache and swap cache.
- The dirty page comments implied `dirty_ratio` starts general kernel flushing. Updated the comments to distinguish process writeback at `dirty_ratio` from background flusher writeback at `dirty_background_ratio`.
- The monitoring section presented `/proc/meminfo` as a detailed container memory breakdown. Updated the comment to note that cgroup files are the source for actual container limits.
- The memory breakdown script only read cgroup v2 memory files. Added cgroup v1 fallbacks for usage, limit, and OOM data.
- The Postgres Compose example used unsupported `POSTGRES_SHARED_BUFFERS` and `POSTGRES_EFFECTIVE_CACHE_SIZE` environment variables. Replaced them with official-image-compatible `postgres -c` server options and added the required `POSTGRES_PASSWORD` environment variable.

## Review Notes
The Docker runtime options in the examples are current and matched local Docker CLI help. The Compose snippet validates with `docker compose config -q`. The JVM recommendations are broadly correct for modern JVMs, though exact heap headroom should still be load-tested for each application.
