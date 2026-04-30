# Validation Summary: How to Deploy InfluxDB via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Docker Standalone
- InfluxDB OSS 2.x
- Telegraf
- Grafana
- Flux
- Python (`influxdb-client`)
- cURL / InfluxDB line protocol

## Sources Consulted
- Docker Docs, Control startup and shutdown order in Compose: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Deploy a stack to a swarm: https://docs.docker.com/engine/swarm/stack-deploy/
- Portainer Docs, Stacks: https://docs.portainer.io/user/docker/stacks
- InfluxDB OSS v2 Docs, Install and set up InfluxDB in a container: https://docs.influxdata.com/influxdb/v2/install/
- InfluxDB OSS v2 Docs, `influx ping`: https://docs.influxdata.com/influxdb/v2/reference/cli/influx/ping/
- InfluxDB OSS v2 Docs, Write data with the InfluxDB API: https://docs.influxdata.com/influxdb/v2/write-data/developer-tools/api/
- InfluxDB OSS v2 Docs, Python client library: https://docs.influxdata.com/influxdb/v2/api-guide/client-libraries/python/
- Telegraf Docs, Configuration options: https://docs.influxdata.com/telegraf/v1/configuration/
- Telegraf Docs, Docker input plugin: https://docs.influxdata.com/telegraf/v1/input-plugins/docker/
- Telegraf Docs, HTTP Response input plugin: https://docs.influxdata.com/telegraf/v1/input-plugins/http_response/
- Telegraf Docs, Prometheus input plugin: https://docs.influxdata.com/telegraf/v1/input-plugins/prometheus/
- Flux Docs, Operators: https://docs.influxdata.com/flux/v0/spec/operators/
- Flux Docs, `float()` function: https://docs.influxdata.com/flux/v0/stdlib/universe/float/
- Grafana Docs, Configure the InfluxDB data source: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/influxdb/configure/
- Official Telegraf 1.29 Docker input plugin README: https://raw.githubusercontent.com/influxdata/telegraf/release-1.29/plugins/inputs/docker/README.md
- Docker Hub official image repositories: https://hub.docker.com/_/influxdb, https://hub.docker.com/_/telegraf, https://hub.docker.com/r/grafana/grafana

## Issues Found
- The post implied a generic Portainer deployment, but the stack uses Compose-only behavior such as `depends_on.condition` that fits a Docker Standalone environment better than Swarm. I clarified the introduction to say the guide targets Portainer managing Docker Standalone.
- The Compose snippet used the top-level `version: "3.8"` field. Current Docker Compose documentation marks the `version` field as obsolete, so I removed it.
- The Telegraf Docker input snippet mixed deprecated and incorrect settings. I removed the empty deprecated `container_names` entry, switched to `perdevice_include`, and added `perdevice = false` so the include list actually takes effect with the pinned Telegraf 1.29 image.
- The Telegraf HTTP response tags block used `[[inputs.http_response.tags]]`, which is the wrong TOML shape. I changed it to `[inputs.http_response.tags]`, which is the documented plugin tags table syntax.
- The Python example used `WritePrecision.NANOSECONDS`, but the official Python client uses `WritePrecision.NS`. I corrected the enum.
- The Flux alert query divided integer fields and multiplied by a float literal, which can fail because Flux arithmetic requires matching numeric types. I converted both fields with `float()` before division.
- The HTTP line protocol example wrote to an `iot-sensors` bucket that the stack never creates. I changed it to the existing `metrics` bucket so the example works as shown.
- The same HTTP write example used `--data-raw` for multiline line protocol. I changed it to `--data-binary`, which is the documented pattern for sending line protocol bodies.

## Review Notes
- The guide is technically valid for InfluxDB OSS 2.x, but InfluxData’s docs now note that InfluxDB 3 Core is the latest stable product line. Keeping the post explicitly scoped to 2.x is appropriate.
- I verified on 2026-04-30 that `influxdb:2.7-alpine`, `telegraf:1.29-alpine`, and `grafana/grafana:latest` currently resolve on Docker Hub.
- The stack still pins `influxdb:2.7-alpine` and `telegraf:1.29-alpine`. These tags are valid for the guide’s 2.x focus, but they should be revisited periodically as upstream images evolve.
- `grafana/grafana:latest` is valid, but pinning a Grafana version would make the deployment more reproducible in the future.
