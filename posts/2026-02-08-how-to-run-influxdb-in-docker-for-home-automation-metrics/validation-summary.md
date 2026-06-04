# Validation Summary: How to Run InfluxDB in Docker for Home Automation Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- InfluxDB OSS 2.x
- InfluxDB CLI
- Flux
- Telegraf
- MQTT
- Home Assistant
- Grafana
- Raspberry Pi

## Sources Consulted
- InfluxDB OSS v2 Docker installation documentation: https://docs.influxdata.com/influxdb/v2/install/
- InfluxDB OSS v2 CLI backup reference: https://docs.influxdata.com/influxdb/v2/reference/cli/influx/backup/
- InfluxDB OSS v2 backup guide: https://docs.influxdata.com/influxdb/v2/admin/backup-restore/backup/
- InfluxDB OSS v2 CLI restore reference: https://docs.influxdata.com/influxdb/v2/reference/cli/influx/restore/
- InfluxDB OSS v2 configuration options: https://docs.influxdata.com/influxdb/v2/reference/config-options/
- InfluxDB OSS v2 CLI reference: https://docs.influxdata.com/influxdb/v2/reference/cli/influx/
- Telegraf configuration documentation: https://docs.influxdata.com/telegraf/v1/configuration/
- Telegraf MQTT consumer plugin documentation: https://docs.influxdata.com/telegraf/v1/input-plugins/mqtt_consumer/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference for `depends_on` and `service_healthy`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Home Assistant InfluxDB integration documentation: https://www.home-assistant.io/integrations/influxdb/

## Issues Found
- The Docker Compose example used the top-level `version: "3.8"` key. Docker's current Compose Specification keeps this key only for backward compatibility and marks it obsolete, so it was removed.
- The Telegraf example used `token = "$INFLUX_TOKEN"`. Telegraf's current documentation shows environment variables in configuration files using the `${INFLUX_TOKEN}` form for strings, so the token reference was updated.
- The Raspberry Pi tuning example set `INFLUXD_STORAGE_CACHE_MAX_MEMORY_SIZE` to `"256m"`. InfluxDB documents this option as bytes and shows integer values, so it was changed to `"268435456"`.
- The backup examples used a generic API token placeholder. InfluxDB backup documentation requires the root authorization token created during setup, so the placeholder was changed to `your-root-token-here`.
- The backup cleanup command could match the parent backup directory itself. It was updated with `-mindepth 1` so only dated backup child directories are removed.
- The restore example omitted InfluxDB's restore behavior for existing buckets and metadata. The text and command were updated to show a full restore with `--full` when replacing a target instance.

## Review Notes
- InfluxDB OSS v2 documentation now notes that InfluxDB 3 Core is the latest stable version, but the post explicitly targets InfluxDB 2.x and pins `influxdb:2.7`, so the 2.x examples remain technically valid for that target.
- The Home Assistant configuration is valid for InfluxDB 2.x. Home Assistant stores many measurements according to entity and unit conventions, so the sample Flux measurement names may need adjustment for a reader's actual data shape.
- The MQTT broker hostname `mqtt-broker` is a deployment-specific service name; it is valid if the broker is reachable on the same Docker network under that name.
