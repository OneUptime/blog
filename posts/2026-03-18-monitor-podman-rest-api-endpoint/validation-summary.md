# Validation Summary: How to Monitor the Podman REST API Endpoint

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman REST API / Libpod API
- Unix domain socket HTTP checks with curl
- Bash health check and alerting scripts
- systemd service and timer units
- Python HTTP metrics exporter
- Prometheus scrape configuration

## Sources Consulted
- Podman REST API reference: https://docs.podman.io/en/v3.0/_static/api-static.html
- Podman events documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman stats documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- systemd timer documentation: https://www.freedesktop.org/software/systemd/man/devel/systemd.timer.html
- curl official man page: https://curl.se/docs/manpage.html

## Issues Found
- The `_ping` examples used `/v4.0.0/libpod/_ping`. Podman documents `_ping` as an unversioned endpoint, so the examples now use `/libpod/_ping`.
- The Prometheus exporter used the deprecated `GET /libpod/containers/{name}/stats` endpoint. It now uses `GET /libpod/containers/stats` with `containers` and `stream=false` query parameters.
- The Prometheus exporter emitted `podman_container_memory_bytes` from `MemUsage`, which is not the byte-valued stats field. It now uses `MemUsageBytes`.
- The events script parsed Docker-style event fields (`Action`, `Actor.Attributes.name`, and numeric `time`). Podman events expose `Status`, `Name`, and `Time`, so the script now parses those fields and uses Podman event statuses such as `died`.
- Removed an unused `json` import after changing the stats parsing logic.

## Review Notes
The Bash scripts and Python exporter were syntax-checked after edits. `curl` options and the `OnCalendar=*:*:00` timer expression were checked locally with `curl --help all` and `systemd-analyze calendar`. Podman itself was not installed in the review environment, so live API calls against a running Podman service could not be executed.
