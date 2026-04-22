# Validation Summary: How to Deploy Sensor Data Collection Pipelines with Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Docker Compose
- Eclipse Mosquitto MQTT broker
- Paho MQTT Python client
- Telegraf MQTT consumer and InfluxDB v2 output
- InfluxDB OSS v2
- Grafana datasource provisioning, Flux queries, and alerting

## Sources Consulted
- Portainer documentation: Add a new stack - https://docs.portainer.io/sts/user/docker/stacks/add
- Docker Compose file reference: Configs top-level element - https://docs.docker.com/reference/compose-file/configs/
- Docker Compose file reference: Version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker documentation: Deploy a stack to a swarm - https://docs.docker.com/engine/swarm/stack-deploy/
- Eclipse Mosquitto configuration manual - https://mosquitto.org/man/mosquitto-conf-5.html
- Eclipse Paho MQTT Python client API - https://eclipse.dev/paho/files/paho.mqtt.python/html/client.html
- Telegraf MQTT Consumer Input Plugin - https://docs.influxdata.com/telegraf/v1/input-plugins/mqtt_consumer/
- Telegraf JSON input data format - https://docs.influxdata.com/telegraf/v1/data_formats/input/json/
- Telegraf InfluxDB v2 output plugin - https://docs.influxdata.com/telegraf/v1/output-plugins/influxdb_v2/
- InfluxDB OSS v2 Docker Compose installation documentation - https://docs.influxdata.com/influxdb/v2/install/use-docker-compose/
- InfluxDB Docker Official Image documentation - https://hub.docker.com/_/influxdb
- Grafana InfluxDB datasource configuration documentation - https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/influxdb/configure/
- Grafana provisioning documentation - https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana alerting documentation - https://grafana.com/docs/grafana/latest/alerting/fundamentals/

## Issues Found
- The prerequisites said the same stack worked with Docker Swarm, but the example uses Docker Standalone Compose behavior such as bridge networking and inline Compose configs. Updated the prerequisite to target a Docker Standalone Portainer environment.
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it to match the current Compose Specification.
- The Mosquitto service exposed ports 8883 and 9001 as TLS and WebSocket endpoints, but the provided `mosquitto.conf` only configured `listener 1883`. Removed those port mappings because TLS requires certificate configuration and WebSockets require a separate WebSocket listener.
- The sensor simulator command was not valid YAML because the embedded Python code was outside the `command` block scalar. Rewrote it as a Compose command list with a shell heredoc and verified the resulting YAML and Python syntax.
- The simulator used the deprecated default Paho callback API by calling `mqtt.Client()` with no callback API version. Updated it to `mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)` and started the Paho network loop with `client.loop_start()`.
- The Grafana service exposed `INFLUXDB_TOKEN` and `INFLUXDB_ORG` for provisioning but not `INFLUXDB_BUCKET`. Added `INFLUXDB_BUCKET` so the datasource provisioning example can resolve all referenced values.
- The Grafana datasource provisioning example was labeled as JSON, included a JSON comment, and omitted Grafana's required provisioning wrapper. Replaced it with a valid YAML provisioning file using `apiVersion: 1` and a `datasources` list.
- The Grafana alerting instructions used the legacy "notification channels" wording. Updated it to the current contact points and notification policies terminology.
- The conclusion called the stack production-ready and easy to scale. Adjusted the wording because the example enables anonymous MQTT and targets a single Docker Standalone deployment.

## Review Notes
The edited YAML snippets were parsed with PyYAML, and the embedded Python simulator code was checked with Python AST parsing. Docker is not installed in this environment, so I could not run `docker compose config` or deploy the stack locally. The image tags are technically valid but pinned to older major/minor versions; check current patch tags and security advisories before using this in production.
