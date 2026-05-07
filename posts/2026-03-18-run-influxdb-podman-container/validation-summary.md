# Validation Summary: How to Run InfluxDB in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- InfluxDB OSS 2.x
- InfluxDB Docker image
- InfluxDB HTTP API
- InfluxDB Line Protocol
- Flux query language
- InfluxDB CLI
- TOML configuration

## Sources Consulted
- InfluxDB Docker Official Image documentation: https://hub.docker.com/_/influxdb
- InfluxDB OSS v2 Docker Compose installation documentation: https://docs.influxdata.com/influxdb/v2/install/use-docker-compose/
- InfluxDB OSS v2 configuration options: https://docs.influxdata.com/influxdb/v2/reference/config-options/
- InfluxDB OSS v2 write API documentation: https://docs.influxdata.com/influxdb/v2/write-data/developer-tools/api/
- InfluxDB OSS v2 query API documentation: https://docs.influxdata.com/influxdb/v2/query-data/execute-queries/influx-api/
- InfluxDB CLI `influx auth create` documentation: https://docs.influxdata.com/influxdb/cloud/reference/cli/influx/auth/create/
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html

## Issues Found
- The image pull comment described `influxdb:2.7` as the latest InfluxDB 2.x image. This is inaccurate because the tag pins a specific 2.x release rather than tracking the latest 2.x release. Changed the comment to "Pull a specific InfluxDB 2.x image."
- The custom `config.toml` used sectioned keys such as `[http] bind-address`, `[query] concurrency`, and `[storage-wal] wal-max-concurrent-writes`. InfluxDB OSS 2.x documents flat configuration keys for these settings. Replaced them with `http-bind-address`, `query-concurrency`, `query-queue-size`, `storage-wal-max-concurrent-writes`, and `storage-wal-max-write-delay`. Removed `flux-enabled` because it is not a documented InfluxDB OSS 2.x configuration option.

## Review Notes
- The post intentionally pins `influxdb:2.7`, which is valid for a version-specific tutorial but is not the newest InfluxDB 2.x line as of this review.
- Podman is not installed in the local review environment, so runtime execution of the container commands was not performed. Commands were reviewed against official Podman, Docker image, InfluxDB API, InfluxDB CLI, and InfluxDB configuration documentation.
