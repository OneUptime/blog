# Validation Summary: How to Filter Docker Container Logs by Time Range

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker container logging
- Docker Compose
- Bash shell scripting
- grep
- jq

## Sources Consulted
- Docker Docs: docker container logs CLI reference, https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs: docker compose logs CLI reference, https://docs.docker.com/reference/cli/docker/compose/logs/
- Docker Docs: View container logs, https://docs.docker.com/engine/logging/
- Local Docker CLI help output: `docker logs --help`
- Local Docker Compose CLI help output: `docker compose logs --help`

## Issues Found
- The post labeled `docker logs --since "2026-02-08T14:30:00"` as RFC 3339 format, but Docker's official CLI documentation distinguishes RFC 3339 timestamps from additional accepted formats such as `2006-01-02T15:04:05` without a timezone offset. Changed the comment to "Show logs since a specific date and time."
- The post said Docker uses the container's creation time and system clock for time calculations, then suggested `docker info --format '{{.OperatingSystem}}'` to check the Docker daemon timezone. That command reports the daemon operating system, not a timezone, and Docker's docs state that timestamps without `Z` or an explicit offset use the local timezone on the client. Replaced this with a note about accepted timestamp formats and a `date +'%Z %z'` command to check the local timezone.
- The post said container log timestamps are always in UTC. Docker's `--timestamps` option adds RFC3339Nano timestamps with a `Z` suffix in the official example, so the wording was narrowed to "Docker-added log timestamps are emitted in UTC."

## Review Notes
The main `docker logs` and `docker compose logs` examples use current supported flags: `--since`, `--until`, `--tail`, `-f/--follow`, and `-t/--timestamps`. Docker documents `--until` for `docker logs` as available with API 1.35 and later. The `jq` examples assume each application log line is valid JSON, which is reasonable for the section but may require additional filtering for mixed plain-text output.
