# Validation Summary: How to Set Up a TIG Stack (Telegraf + InfluxDB + Grafana) with Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Telegraf
- InfluxDB 2.x
- Grafana
- Flux
- TOML and YAML configuration

## Sources Consulted
- Docker Compose startup order and `depends_on.condition: service_healthy`: https://docs.docker.com/compose/how-tos/startup-order/
- InfluxDB OSS v2 Docker Compose setup: https://docs.influxdata.com/influxdb/v2/install/use-docker-compose/
- InfluxDB OSS v2 query API: https://docs.influxdata.com/influxdb/v2/api/query-data/
- InfluxDB OSS v2 configuration options: https://docs.influxdata.com/influxdb/v2/reference/config-options/
- Telegraf InfluxDB v2 output plugin: https://docs.influxdata.com/telegraf/v1/output-plugins/influxdb_v2/
- Telegraf Docker input plugin: https://docs.influxdata.com/telegraf/v1/input-plugins/docker/
- Telegraf latest release metadata: https://api.github.com/repos/influxdata/telegraf/releases/latest
- Telegraf disk input plugin host-container guidance: https://github.com/influxdata/telegraf/blob/v1.29.0/plugins/inputs/disk/README.md
- Telegraf configuration environment variable syntax: https://github.com/influxdata/telegraf/blob/v1.29.0/docs/CONFIGURATION.md
- Grafana InfluxDB data source provisioning: https://grafana.com/docs/grafana/latest/datasources/influxdb/configure/
- Grafana dashboard provisioning: https://grafana.com/docs/grafana/latest/administration/provisioning/

## Issues Found
- The Docker Compose snippet used the obsolete top-level `version: "3.8"` key. Removed it to align with current Compose usage.
- The Telegraf container mounted `/proc` and `/sys` separately, which is not enough for accurate host disk metrics from inside a container. Changed the mount to `/:/hostfs:ro` and set `HOST_PROC`, `HOST_SYS`, and `HOST_MOUNT_PREFIX`.
- The Telegraf output token used `"$INFLUX_TOKEN"`, but Telegraf documents environment interpolation as `"${INFLUX_TOKEN}"`. Updated the token value.
- The Telegraf Docker input used deprecated options (`container_names`, `perdevice`, and `total`). Updated the post to use `container_name_include`, `perdevice_include`, and `total_include`, and updated the Telegraf image to `telegraf:1.38.4`.
- Grafana dashboard provisioning pointed at the provisioning directory itself. Moved dashboard JSON files to `grafana/dashboards`, mounted that directory into Grafana, and updated the provider path to `/var/lib/grafana/dashboards`.

## Review Notes
The examples use hard-coded demo credentials and tokens, which is acceptable for a local tutorial but should be replaced with Docker secrets or environment files for production use.
