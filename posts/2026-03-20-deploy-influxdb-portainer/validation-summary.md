# Validation Summary: How to Deploy InfluxDB via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- InfluxDB 2.7 (time-series database)
- Telegraf 1.29 (metrics collection agent)
- Grafana 10.3.1 (dashboard / visualization)
- Docker Compose (stack orchestration via Portainer)
- influxdb-client Python library
- Flux query language

## Sources Consulted
- InfluxDB 2.x official Docker image documentation (https://hub.docker.com/_/influxdb) — verified `DOCKER_INFLUXDB_INIT_*` environment variables and volume paths `/var/lib/influxdb2` and `/etc/influxdb2`.
- InfluxDB 2.x CLI reference (https://docs.influxdata.com/influxdb/v2/reference/cli/influx/) — verified `influx ping`, `influx write`, and `influx query` subcommands and flags.
- Telegraf 1.29 docker input plugin docs (https://github.com/influxdata/telegraf/tree/release-1.29/plugins/inputs/docker) — verified plugin options.
- Telegraf agent / outputs.influxdb_v2 docs — verified TOML config keys (`urls`, `token`, `organization`, `bucket`).
- influxdb-client-python docs (https://github.com/influxdata/influxdb-client-python) — verified `InfluxDBClient`, `Point`, `SYNCHRONOUS`, `write_api` usage.
- Grafana 10.x documentation and What's New (https://grafana.com/docs/grafana/latest/whatsnew/) — verified the navigation reorganization in Grafana 10.0+.
- Docker Compose specification — verified `depends_on` with `condition: service_healthy` syntax.

## Issues Found
- **Grafana navigation path was outdated for Grafana 10.3.1.** The post instructed users to go to **Configuration > Data Sources > Add data source**, which was the path in Grafana 8.x/9.x. In Grafana 10.0+, the navigation was reorganized and data sources moved under **Connections**. Updated the path to **Connections > Data sources > Add new data source** to match the actual UI in Grafana 10.3.1 (the version pinned in the compose file).

## Review Notes
- The Telegraf docker input plugin uses several options that are technically deprecated but still accepted in Telegraf 1.29:
  - `container_names = []` — deprecated since Telegraf 1.4.0; superseded by `container_name_include`. Still functional.
  - `perdevice = true` — deprecated since Telegraf 1.18.0; superseded by `perdevice_include`. Still functional but emits a deprecation warning at startup.
  - `total = false` — deprecated since Telegraf 1.18.0; superseded by `total_include`. Still functional with deprecation warning.
  Future updates of the post may want to migrate to the non-deprecated options to silence the warnings.
- Grafana dashboard ID `1150` ("Docker Dashboard for Telegraf") was originally authored for InfluxDB 1.x with InfluxQL. Since this stack uses InfluxDB 2.x with the Flux query language, the imported dashboard may not work out of the box — panels would need their queries rewritten in Flux, or users may prefer a Flux-native dashboard (e.g., 14282). The post does mention building custom panels with Flux as an alternative, so this is a soft caveat rather than a blocking error.
- The `DOCKER_INFLUXDB_INIT_ADMIN_TOKEN`, `DOCKER_INFLUXDB_INIT_PASSWORD`, and `GF_SECURITY_ADMIN_PASSWORD` values are example credentials. The post would benefit from a brief note reminding readers to replace them with strong values (and ideally inject via Portainer secrets / env files) before running in any non-isolated environment.
- The `influx ping` healthcheck relies on the `influx` CLI shipped inside the official `influxdb:2.7-alpine` image, which it is — so the healthcheck is valid.
