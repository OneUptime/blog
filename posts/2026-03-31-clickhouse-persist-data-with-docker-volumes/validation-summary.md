# Validation Summary: How to Persist ClickHouse Data with Docker Volumes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (version 24.3)
- Docker (Compose V2)
- Docker Volumes and Bind Mounts

## Sources Consulted
- Docker Hub: clickhouse/clickhouse-server — https://hub.docker.com/r/clickhouse/clickhouse-server
- ClickHouse Docker install docs — https://clickhouse.com/docs/en/install#from-docker-image
- ClickHouse system.disks table docs — https://clickhouse.com/docs/en/operations/system-tables/disks
- ClickHouse server Dockerfile (GitHub) — confirms UID/GID 101 for the clickhouse user

## Issues Found
- **Restart test did not prove volume persistence**: The original test used `docker compose restart clickhouse` to verify data survived. However, `docker compose restart` only stops and starts the container without removing it, so data in the container's writable layer would survive even without volumes. Changed the test to use `docker compose down` followed by `docker compose up -d`, which removes the container entirely and recreates it — properly demonstrating that data persists via the named volume.

## Review Notes
- The `version: "3.8"` field in the Compose file is ignored by Docker Compose V2 (the version used with `docker compose` without hyphen). It is not an error but is now unnecessary. This is a minor style point, not a technical issue.
- The `--query` flag with multiple semicolon-separated statements works in ClickHouse 24.3 because multi-query became the default behavior (the `--multiquery` flag was deprecated in earlier 23.x versions).
- All verified: data/log paths (`/var/lib/clickhouse`, `/var/log/clickhouse-server`), environment variables (`CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`), UID 101 for bind mount permissions, `system.disks` table columns, and the backup/upgrade commands.
