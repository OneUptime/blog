# Validation Summary: How to View Container Resource Usage in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (container stats UI)
- Docker CLI (`docker stats`)
- cAdvisor (container metrics exporter)
- Prometheus (metrics / alerting)
- Docker Compose (resource limits and reservations)
- Linux OOM killer / OOMKilled behavior

## Sources Consulted
- Docker `docker stats` reference: https://docs.docker.com/reference/cli/docker/container/stats/
- cAdvisor running docs: https://github.com/google/cadvisor/blob/master/docs/running.md
- cAdvisor Prometheus metrics: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Docker Compose spec (services / deploy.resources): https://docs.docker.com/reference/compose-file/services/
- GNU coreutils `sort` documentation (for `-h` behavior)
- Docker runtime / OOM behavior docs: https://docs.docker.com/config/containers/resource_constraints/

## Issues Found
1. **Memory-usage sort command printed the wrong field.** The snippet piped `docker stats --format "{{.MemUsage}}\t{{.Name}}"` into `awk '{print $1, $3}'`. Because `{{.MemUsage}}` renders as `256MiB / 512MiB` (space-separated) and awk's default FS splits on any whitespace (including the tab), the fields are `$1=usage`, `$2=/`, `$3=limit`, `$4=name`. So `$3` printed the memory *limit* instead of the container name. Changed to `$1, $4` so the output shows usage and container name, matching the stated intent of "find resource-heavy containers." Added a short inline comment clarifying the column mapping.
2. **cAdvisor `/var/run` mount mode.** The example mounted `/var/run:/var/run:ro`. The official cAdvisor running guide uses read-write (`:rw`) for `/var/run`; cAdvisor writes its unix socket/probe state there on some distros and a read-only mount can break metric collection. Changed to `:rw` to match the upstream recommendation.

## Review Notes
- `docker stats` flags and placeholders (`--no-stream`, `--format "table ..."`, `{{.Name}}`, `{{.CPUPerc}}`, `{{.MemUsage}}`, `{{.NetIO}}`, `{{.BlockIO}}`) are all current.
- `gcr.io/cadvisor/cadvisor:v0.47.2` is a real published tag. The current stable line is newer (v0.56.x as of early 2025); the pinned version still works but readers upgrading production stacks may want to move to the latest patch release for security fixes.
- cAdvisor sometimes requires `privileged: true` (notably on RHEL/CentOS/Fedora) and benefits from `--pid=host` for process metrics. The minimal example here works on typical Debian/Ubuntu hosts without these; left as-is to avoid scope creep.
- Prometheus metric names `container_memory_usage_bytes` and `container_spec_memory_limit_bytes` are current cAdvisor metrics.
- `deploy.resources.limits.memory` / `deploy.resources.reservations.memory` is honored by Docker Compose v2 outside Swarm mode, so the example is valid for `docker compose up` users.
- `sort -h` strictly parses single-letter SI suffixes (K, M, G, T). With `MiB`/`GiB` output it works *coincidentally* in most mixed cases because the first suffix letter still orders correctly, but it is not strictly reliable across edge cases (e.g., mixing `KiB` and `kB`). Not considered a hard error, but future revisions could normalize with `numfmt --from=iec` before sorting for fully reliable ordering.
- OOMKilled terminology is accurate: Docker sets `State.OOMKilled=true` and Portainer surfaces this in the container state UI. `docker ps -a` shows `Exited (137)` for SIGKILL.
