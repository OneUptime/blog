# Validation Summary: How to Manage ClickHouse Docker Container Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (server logging configuration, system tables)
- Docker (container logs, logging drivers, Docker Compose)
- Grafana Loki Docker logging driver plugin

## Sources Consulted
- ClickHouse Server Configuration Parameters (logger section): https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse system.text_log documentation: https://clickhouse.com/docs/operations/system-tables/text_log
- Grafana Loki Docker Driver Configuration: https://grafana.com/docs/loki/latest/send-data/docker-driver/configuration/
- Docker logging drivers documentation: https://docs.docker.com/config/containers/logging/configure/

## Issues Found

1. **Non-existent log file `clickhouse-server-text.log`**: The post listed `clickhouse-server-text.log` as a default ClickHouse log file with the description "Human-readable structured log." This file does not exist in the default ClickHouse configuration. The confusion likely stems from the `system.text_log` system table, which stores log entries in a ClickHouse table — not a file on disk. Removed the row from the table.

2. **Incomplete log levels list**: The post listed only five log levels (`trace`, `debug`, `information`, `warning`, `error`). ClickHouse actually supports eight levels: `trace`, `debug`, `information`, `notice`, `warning`, `error`, `critical`, `fatal`. Added the three missing levels.

3. **Incorrect Loki driver option name**: The post used `loki-labels` as a Docker logging driver option for the Grafana Loki plugin. The correct option name is `loki-external-labels`. Changed to the correct option name.

## Review Notes
- The Loki Docker logging driver is a third-party plugin that must be installed separately (`docker plugin install grafana/loki-docker-driver:latest --alias loki --grant-all-permissions`). The post does not mention this prerequisite. While not technically incorrect, readers may be confused if they try to use the `loki` driver without installing the plugin first.
- The ClickHouse Docker image tag `24.3` is valid but will eventually become outdated. This is acceptable for a tutorial.
- The UID/GID `101:101` for the `clickhouse` user in the Docker container is correct for the official `clickhouse/clickhouse-server` image.
