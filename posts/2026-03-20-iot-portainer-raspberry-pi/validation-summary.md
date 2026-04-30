# Validation Summary: How to Deploy IoT Applications on Raspberry Pi with Portainer - Part 2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- Raspberry Pi
- Eclipse Mosquitto
- MQTT
- Node-RED
- InfluxDB 2.7
- Grafana
- I2C sensor access from containers

## Sources Consulted
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer stacks and update behavior: https://docs.portainer.io/user/docker/stacks
- Portainer FAQ referencing Pull and redeploy: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/empty-relative-bind-mounts
- Eclipse Mosquitto official Docker image docs: https://hub.docker.com/_/eclipse-mosquitto/
- Mosquitto configuration reference: https://mosquitto.org/man/mosquitto-conf-5.html
- Mosquitto password utility reference: https://mosquitto.org/man/mosquitto_passwd-1.html
- Node-RED Palette Manager docs: https://nodered.org/docs/user-guide/editor/palette/manager
- Node-RED MQTT JSON parsing cookbook: https://cookbook.nodered.org/mqtt/receive-json
- `node-red-contrib-influxdb` package docs: https://flows.nodered.org/node/node-red-contrib-influxdb
- InfluxDB OSS v2 Docker Compose setup docs: https://docs.influxdata.com/influxdb/v2/install/use-docker-compose/
- InfluxDB bucket retention docs: https://docs.influxdata.com/influxdb/v2/admin/buckets/create-bucket/
- Grafana Docker docs: https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/
- Grafana InfluxDB data source docs: https://grafana.com/docs/grafana/latest/datasources/influxdb/
- Grafana InfluxDB data source configuration docs: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/influxdb/configure/
- Grafana Geomap docs: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/geomap/
- Grafana Geomap plugin page: https://grafana.com/grafana/plugins/geomap/
- Archived Worldmap plugin repository: https://github.com/grafana/worldmap-panel
- Docker runtime privileges and devices docs: https://docs.docker.com/engine/containers/run/

## Issues Found
- The stack exposed port `8883` as “MQTT over TLS” but the Mosquitto configuration never defined a TLS listener or certificates. I removed the `8883` mapping so the example matches the actual broker configuration.
- The Grafana example used `GF_INSTALL_PLUGINS`, while current Grafana Docker docs use `GF_PLUGINS_PREINSTALL`. I updated the environment variable accordingly.
- The Grafana example tried to preinstall `grafana-worldmap-panel`, but Grafana now includes the native Geomap panel and the old Worldmap plugin repository is archived. I removed the archived plugin from the example.
- The Node-RED section assumed an `influxdb out` node was already available. It is not a core Node-RED node. I added the required `node-red-contrib-influxdb` installation step through Manage Palette.
- The Node-RED function example built `msg.measurement`, `msg.tags`, and `msg.fields`, which does not match the documented input format for the `influxdb out` node. I changed it to send `msg.payload` as `[fields, tags]` and clarified the measurement setting on the output node.
- The Grafana InfluxDB data source instructions omitted required Flux-oriented fields for an InfluxDB 2.x setup. I added `Query language: Flux` and `Default Bucket: iot_sensors`, and clarified that the token should be created or copied from the InfluxDB UI.
- The hardware sensor example described generic GPIO access but only mapped `/dev/i2c-1`, and it marked `privileged: true` as required. Docker documents device mapping without full privileged mode, so I changed the example to correctly describe I2C access and removed the unnecessary privileged flag.

## Review Notes
- The post is technically sound after the fixes above.
- The `influxdb:2.7` setup remains valid, but InfluxData’s current docs note that InfluxDB 3 Core is the latest stable line overall; this post is specifically using the v2 API and initialization flow.
- The hardcoded passwords and floating `latest` image tags are functional, but future revisions should prefer secrets and pinned image tags for reproducibility and safer production use.
