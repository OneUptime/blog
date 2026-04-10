# Validation Summary: How to Monitor Redis Docker Container Resource Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI (`docker stats`, `docker inspect`)
- Docker Compose V2 (resource limits via `deploy.resources`)
- Redis 7 (INFO command sections: memory, stats, clients)
- cAdvisor (container metrics exporter)
- Prometheus (PromQL queries for container metrics)

## Sources Consulted
- [Docker container stats CLI reference](https://docs.docker.com/reference/cli/docker/container/stats/) — verified `--no-stream`, `--format`, and Go template field names
- [Docker CLI formatting guide](https://docs.docker.com/engine/cli/formatting/) — verified JSON output format syntax
- [Docker Compose Deploy Specification](https://docs.docker.com/reference/compose-file/deploy/) — verified `deploy.resources.limits` works in Compose V2 without Swarm
- [cAdvisor Prometheus metrics documentation](https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md) — verified all metric names (`container_memory_usage_bytes`, `container_spec_memory_limit_bytes`, `container_cpu_usage_seconds_total`, `container_network_receive_bytes_total`, `container_fs_reads_bytes_total`, `container_fs_writes_bytes_total`)
- [cAdvisor runtime options](https://github.com/google/cadvisor/blob/master/docs/runtime_options.md) — verified `--docker_only=true` flag
- [Redis INFO command documentation](https://redis.io/docs/latest/commands/info/) — verified field names for memory, stats, and clients sections
- [Docker inspect format reference](https://docs.docker.com/reference/cli/docker/inspect/) — verified `.State.OOMKilled` and `.State.ExitCode` paths

## Issues Found
- **`--format json` shorthand**: The command `docker stats redis --no-stream --format json` used a shorthand that is not the standard documented syntax for Docker CLI. Changed to `--format '{{json .}}'` which is the canonical Go template form supported across all Docker CLI versions.

## Review Notes
- The cAdvisor image location `gcr.io/cadvisor/cadvisor:latest` is correct and functional, though newer cAdvisor releases (v0.53.0+) are also published to `ghcr.io/google/cadvisor`. Both registries work; no change needed.
- The `version: "3.8"` field in the cAdvisor Compose file is accepted but considered optional/deprecated in Docker Compose V2. It triggers a warning but does not cause errors. Not changed since it does not affect functionality.
- The docker-compose.yml snippet references a `redis-data` named volume without declaring it at the top level. This is intentional as a snippet showing resource configuration, not a complete Compose file.
- All Prometheus queries, Redis INFO field names, bash script logic, and OOM detection commands are technically correct.
