# Validation Summary: How to Collect Docker Metrics with cAdvisor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- cAdvisor
- Prometheus
- PromQL
- Grafana

## Sources Consulted
- cAdvisor running documentation: https://github.com/google/cadvisor/blob/master/docs/running.md
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- cAdvisor runtime options documentation: https://github.com/google/cadvisor/blob/master/docs/runtime_options.md
- cAdvisor GitHub releases: https://github.com/google/cadvisor/releases
- Prometheus cAdvisor guide: https://prometheus.io/docs/guides/cadvisor/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Docker Compose version and name documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Referenced OneUptime post: https://oneuptime.com/blog/post/2026-01-16-docker-prometheus-grafana/view

## Issues Found
- The Docker Compose examples used the obsolete top-level `version: '3.8'` field. Docker Compose now treats this field as backward-compatible metadata and warns that it is obsolete, so it was removed from both Compose snippets.
- The cAdvisor image was pinned to `gcr.io/cadvisor/cadvisor:v0.47.2`, which is outdated. Current cAdvisor documentation and releases use `ghcr.io/google/cadvisor` for newer versions, so both examples were updated to `ghcr.io/google/cadvisor:v0.60.1`.
- The production `--disable_metrics` list disabled `disk` and `diskIO`, which would suppress filesystem metrics listed elsewhere in the post, including `container_fs_usage_bytes`, `container_fs_reads_bytes_total`, and `container_fs_writes_bytes_total`. The list was updated to preserve filesystem metrics while still disabling high-cardinality or commonly disabled collectors.
- The production `--disable_metrics` list omitted several metrics that cAdvisor disables by default in current releases. Because setting `--disable_metrics` overrides the default list, the snippet could accidentally enable unwanted collectors such as `process`, `advtcp`, `cpuset`, `memory_numa`, and `resctrl`. The list was updated to include current default-disabled collectors plus `percpu`.

## Review Notes
The Prometheus scrape configuration and listed metric names are technically valid. The memory percentage query assumes containers have meaningful memory limits; for unlimited containers, the denominator can make the result less useful and should be handled in production dashboards.
