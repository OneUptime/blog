# Validation Summary: How to Monitor Docker Events in Real Time

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker Engine events
- Docker Compose
- Docker SDK for Python
- Shell scripting with jq and curl
- Prometheus scraping
- Docker events Prometheus exporter

## Sources Consulted
- Docker CLI documentation for `docker system events`: https://docs.docker.com/reference/cli/docker/system/events/
- Local Docker CLI help for `docker events --help` using Docker Engine 29.4.2 / API 1.54
- Docker SDK for Python client events documentation: https://docker-py.readthedocs.io/en/stable/client.html
- Docker Compose documentation for obsolete top-level `version`: https://docs.docker.com/reference/compose-file/version-and-name/
- neuroforgede/docker-engine-events-exporter README: https://github.com/neuroforgede/docker-engine-events-exporter
- Local `docker manifest inspect` checks for exporter images

## Issues Found
- The Docker Compose examples used the top-level `version: '3.8'` field. Docker Compose now treats this field as obsolete and emits a warning, so I removed it from both Compose snippets.
- The Prometheus exporter example used `ghcr.io/prometheus-community/docker-event-exporter:latest` on port `9153`, but that image could not be verified as a public pullable GHCR image. I changed the example to `ghcr.io/neuroforgede/docker-engine-events-exporter:latest`, which has a public manifest and documents Prometheus scraping on port `9000`, then updated the port mapping and scrape target accordingly.

## Review Notes
- The Docker event commands, filters, time range flags, Go-template formatting, and JSON formatting are consistent with Docker's official CLI documentation.
- The Python `client.events(decode=True)` example is consistent with Docker SDK for Python documentation.
- The shell alert example uses the documented event JSON fields, including `Actor.Attributes.name` and `Actor.Attributes.exitCode`.
- The `prom/prometheus:v2.47.0` image pin is older but still syntactically valid; consider updating it in a future content refresh if the blog wants current Prometheus versions.
