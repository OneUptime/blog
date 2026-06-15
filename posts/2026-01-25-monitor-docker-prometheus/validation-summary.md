# Validation Summary: How to Monitor Docker with Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker Engine Prometheus metrics
- Prometheus
- PromQL
- Prometheus alerting and recording rules
- cAdvisor
- Grafana
- Alertmanager

## Sources Consulted
- Docker Docs: Collect Docker metrics with Prometheus - https://docs.docker.com/engine/daemon/prometheus/
- Docker Docs: Compose version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose service reference, extra_hosts - https://docs.docker.com/reference/compose-file/services/#extra_hosts
- Prometheus Docs: Monitoring Docker container metrics using cAdvisor - https://prometheus.io/docs/guides/cadvisor/
- Prometheus Docs: Configuration reference - https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Docs: Template reference - https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- cAdvisor Docs: Running cAdvisor - https://github.com/google/cadvisor/blob/master/docs/running.md
- cAdvisor Docs: Prometheus metrics storage documentation - https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md

## Issues Found
- The Docker Compose example used the obsolete top-level `version` key. Removed it because current Docker Compose treats it as obsolete and ignores it.
- The cAdvisor Compose example used `gcr.io/cadvisor/cadvisor:latest`. Updated it to `ghcr.io/google/cadvisor:latest`, matching current cAdvisor guidance for v0.53.0 and newer.
- The Docker daemon JSON included a `// /etc/docker/daemon.json` comment inside a `json` fenced block, which made the snippet invalid JSON. Removed the comment from the JSON block.
- The Docker daemon metrics example used `"experimental": true`. Removed it because current Docker documentation no longer requires the experimental flag for the Prometheus metrics example.
- The Docker daemon metrics example kept `0.0.0.0:9323` so the Prometheus container can reach the host daemon via `host.docker.internal`. Docker's current standalone example uses `127.0.0.1:9323` as a safer default, but that loopback-only bind can fail for this Compose topology on Linux.
- The Prometheus Docker Engine scrape target used `localhost:9323`, which would point at the Prometheus container itself in the provided Compose setup. Changed it to `host.docker.internal:9323` and added the Compose `extra_hosts` mapping for Linux.
- The CPU percentage example described the query as "percentage of total CPU"; the expression reports percent of one CPU core and can exceed 100% on multicore hosts. Updated the comment for accuracy.
- The restart-loop alert used `increase(container_start_time_seconds[1h])`, which is not a restart count because `container_start_time_seconds` is a timestamp gauge. Replaced it with `changes(container_start_time_seconds[1h])`.

## Review Notes
The edited Docker Compose snippet was validated with `docker compose config --quiet`, and the Docker daemon snippet was parsed as JSON locally. `promtool` was not installed in the environment, so Prometheus rule syntax was reviewed against official Prometheus documentation rather than validated with the Prometheus CLI.
