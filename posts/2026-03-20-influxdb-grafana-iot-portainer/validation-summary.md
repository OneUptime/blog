# Validation Summary: How to Deploy InfluxDB + Grafana for IoT Data via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- InfluxDB OSS 2.x
- Flux
- Grafana
- InfluxDB line protocol
- Python `influxdb-client`

## Sources Consulted
- InfluxDB OSS v2 Docker Compose setup: https://docs.influxdata.com/influxdb/v2/install/use-docker-compose/
- `influx ping` CLI reference: https://docs.influxdata.com/influxdb/v2/reference/cli/influx/ping/
- InfluxDB write API reference: https://docs.influxdata.com/influxdb/v2/api/write-data/
- InfluxDB line protocol reference: https://docs.influxdata.com/influxdb/v2/reference/syntax/line-protocol/
- InfluxDB task creation docs: https://docs.influxdata.com/influxdb/v2/process-data/manage-tasks/create-task/
- InfluxDB downsampling guidance: https://docs.influxdata.com/influxdb/cloud/process-data/common-tasks/downsample-data/
- Flux `last()` reference: https://docs.influxdata.com/flux/v0/stdlib/universe/last/
- Grafana Docker installation docs: https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/
- Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana InfluxDB data source configuration docs: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/influxdb/configure/
- Grafana 10.2.0 Docker image build file: https://raw.githubusercontent.com/grafana/grafana/v10.2.0/Dockerfile
- Grafana 10.2.0 Docker entrypoint: https://raw.githubusercontent.com/grafana/grafana/v10.2.0/packaging/docker/run.sh

## Issues Found
- Grafana datasource provisioning was described as a post-deploy file change only. Grafana provisions datasources during startup, so I updated the instructions to restart the Grafana container after adding the provisioning file.
- The second Flux dashboard query did not match its description. `last()` operates per input table, and the original `group()` plus `count()` sequence did not correctly represent device status. I replaced it with a query that correctly counts active devices with readings in the last five minutes.
- The downsampling section implied the shown Flux script created the destination bucket and could simply be run in Data Explorer. InfluxDB downsampling tasks require a separate destination bucket first, and the script should be saved as a task. I corrected that instruction.
- The conclusion claimed this setup could handle “millions of sensor readings per second” and described downsampling as built-in. That performance claim is too absolute for an unqualified Portainer deployment, and downsampling in this workflow is provided by InfluxDB tasks. I replaced the sentence with a technically bounded description.

## Review Notes
- The post intentionally targets InfluxDB 2.x and Flux-based queries. That is valid, but it is version-specific because InfluxDB 3 is now the latest stable line.
- The pinned Grafana image is `10.2.0`. For that version, `GF_INSTALL_PLUGINS` is still valid in the Docker entrypoint, but newer Grafana documentation prefers `GF_PLUGINS_PREINSTALL`.
