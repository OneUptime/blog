# Validation Summary: How to Deploy InfluxDB + Grafana for IoT Data via Portainer

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- InfluxDB OSS v2
- Grafana
- Flux
- Python
- `influxdb-client` Python library

## Sources Consulted
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- InfluxDB OSS v2 Docker Compose docs: https://docs.influxdata.com/influxdb/v2/install/use-docker-compose/
- InfluxDB OSS v2 Python client docs: https://docs.influxdata.com/influxdb/v2/api-guide/client-libraries/python/
- InfluxDB OSS v2 write API docs: https://docs.influxdata.com/influxdb/v2/api/write-data/
- InfluxDB OSS v2 bucket retention docs: https://docs.influxdata.com/influxdb/v2/admin/buckets/create-bucket/
- Docker Official Image docs for `influxdb`: https://hub.docker.com/_/influxdb
- Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana InfluxDB data source configuration docs: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/influxdb/configure/
- Grafana alert rule creation from panels: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-alerts-panels/
- Grafana-managed alert rule docs: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-grafana-managed-rule/

## Issues Found
- Grafana data source provisioning was presented as a post-deploy step without noting that provisioned data sources are added or updated during startup. I updated Step 2 to make the file creation happen on the Docker host and to tell readers to restart or redeploy Grafana if it is already running.
- The Python writer example used `http://influxdb:8086`, which only resolves from another container on the same Docker network. I changed it to `http://localhost:8086` so the example matches the published container port and the standalone application context shown in the post.
- The Python `write_api.write()` example omitted the `org` argument. I added `org="iot-org"` to match documented InfluxDB v2 Python client usage.
- The Grafana alerting steps used outdated UI and terminology (`Alert > Create Alert Rule` and `notification channels`). I updated the instructions to the current panel-menu flow and `contact points` terminology.

## Review Notes
- InfluxData documents InfluxDB 3 Core as the latest stable OSS release, but this post intentionally targets InfluxDB 2.x because it uses Flux and the InfluxDB 2.x setup flow.
- The post correctly avoids `influxdb:latest`; Docker's official image docs note that `latest` is scheduled to point to InfluxDB 3 Core on May 27, 2026.
- The pinned image tags in the post are explicit and reproducible, but readers should still verify newer supported tags before production deployment.
