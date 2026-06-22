# Validation Summary: How to Monitor Docker Container Resource Usage in Real Time

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker Engine daemon configuration
- Docker Compose
- cAdvisor
- Prometheus
- Grafana
- Bash scripting

## Sources Consulted
- Docker CLI reference: `docker container stats` - https://docs.docker.com/reference/cli/docker/container/stats/
- Docker CLI reference: `docker system df` - https://docs.docker.com/reference/cli/docker/system/df/
- Docker CLI reference: `docker system info` - https://docs.docker.com/reference/cli/docker/system/info/
- Docker CLI reference: `docker inspect` - https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI reference: `docker system events` - https://docs.docker.com/reference/cli/docker/system/events/
- Docker Engine Prometheus metrics documentation - https://docs.docker.com/engine/daemon/prometheus/
- Docker Compose `version` top-level element documentation - https://docs.docker.com/reference/compose-file/version-and-name/
- cAdvisor official README - https://github.com/google/cadvisor
- Local Docker CLI help output for `docker stats`, `docker system df`, `docker inspect`, `docker info`, and `docker events`

## Issues Found
- The `docker inspect` section described the example as showing memory limit and usage, but `{{.HostConfig.Memory}}` only reports the configured memory limit. Changed the wording to "Memory limit" and described the section as configuration and state.
- The cAdvisor examples used the older `gcr.io/cadvisor/cadvisor:latest` image and omitted currently documented mounts/device options. Updated the examples to use `ghcr.io/google/cadvisor:latest`, add `/dev/disk` as a read-only volume, and add `/dev/kmsg` as a device.
- The Docker Compose examples used the obsolete top-level `version: '3.8'` field. Removed it from both Compose snippets.
- The Prometheus scrape target used `localhost:9323`, which does not reach the host Docker daemon from inside the Prometheus container. Changed the target to `host.docker.internal:9323`, added the Compose `extra_hosts` mapping, and changed the daemon metrics bind address to `0.0.0.0:9323` with a security caveat.
- The Docker daemon metrics configuration included `"experimental": true`, which is not part of the current Docker documentation for enabling the metrics endpoint. Removed it.
- The CSV export script header split network I/O into `net_in,net_out`, but `{{.NetIO}}` emits one combined field. Changed the header to `net_io`.

## Review Notes
The main Docker CLI commands and formatting placeholders are current. Docker Compose validation was run against the cAdvisor-only and full monitoring stack examples with `docker compose config -q`, and both snippets parsed successfully after the corrections.
