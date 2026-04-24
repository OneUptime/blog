# Validation Summary: How to Manage PLCs and Gateways with Portainer Edge

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Compute
- Portainer Edge Stacks
- Portainer Edge Configurations
- Docker Compose
- Docker macvlan networking
- Eclipse Mosquitto
- InfluxDB OSS 2.x
- Telegraf
- OPC UA
- Modbus
- EtherNet/IP
- MQTT

## Sources Consulted
- Portainer Edge Compute documentation: https://docs.portainer.io/user/edge
- Portainer Edge Stacks documentation: https://docs.portainer.io/user/edge/stacks
- Portainer Edge Configurations documentation: https://docs.portainer.io/user/edge/configurations
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker macvlan driver documentation: https://docs.docker.com/engine/network/drivers/macvlan/
- Telegraf configuration documentation: https://docs.influxdata.com/telegraf/v1/configuration/
- Telegraf MQTT Consumer input plugin documentation: https://docs.influxdata.com/telegraf/v1/input-plugins/mqtt_consumer/
- Telegraf JSON input format documentation: https://docs.influxdata.com/telegraf/v1/data_formats/input/json/
- Telegraf InfluxDB v2 output plugin documentation: https://docs.influxdata.com/telegraf/v1/output-plugins/influxdb_v2/
- InfluxDB OSS v2 Docker Compose documentation: https://docs.influxdata.com/influxdb/v2/install/use-docker-compose/
- InfluxDB OSS v2 Docker initialization environment variables: https://docs.influxdata.com/influxdb/v2/install/upgrade/v1-to-v2/docker/
- Eclipse Mosquitto Docker Official Image: https://hub.docker.com/_/eclipse-mosquitto/
- InfluxDB Docker Official Image: https://hub.docker.com/_/influxdb/
- Telegraf Docker Official Image: https://hub.docker.com/_/telegraf/

## Issues Found
- The first Compose example used the obsolete top-level `version` key. I removed it to match the current Compose Specification.
- The InfluxDB/Telegraf configuration was incomplete: the post referenced `INFLUX_TOKEN` in `telegraf.conf` but did not inject the token into the Telegraf container or initialize a known admin token in InfluxDB. I added `DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=${INFLUX_TOKEN}` to the InfluxDB service and `INFLUX_TOKEN=${INFLUX_TOKEN}` to the Telegraf service.
- The service name `telegraph` did not match the actual product name. I corrected it to `telegraf`.
- The multi-PLC stack used `mosquitto` as a hostname without defining how that stack joined the broker's network. I added explicit network attachments plus an external shared network declaration, and I gave the first stack's `plc-net` an explicit name so the second stack can reuse it.
- Portainer Edge Configurations are uploaded as ZIP packages, not as loose files. I corrected the wording in Step 2.
- Docker's documented macvlan examples use the `-o parent=...` option form and note that macvlan-attached containers cannot communicate with the host directly. I updated the command example and added the host-communication caveat.
- The original protocol-bridge image names and environment variables were presented as if they were directly usable examples, but they are connector-specific placeholders. I clarified that readers should replace them with the image names and settings documented by their chosen bridge vendor or project.
- The original best-practice guidance implied that routing traffic through a Docker bridge was itself the security control. I rewrote that line so it accurately focuses on keeping PLC-facing protocols on dedicated OT networks and exposing only required northbound interfaces.

## Review Notes
- The Telegraf `json` parser used in the example is still supported, but current Telegraf documentation labels it as the legacy JSON parser and recommends `json_v2` for most new configurations.
- The pinned image tags shown in the post remain valid as of April 24, 2026, but newer image tags exist for Mosquitto, InfluxDB, and Telegraf.
- `docker` was not installed in the workspace, so I validated the Compose and Telegraf snippets with local YAML/TOML parsing rather than `docker compose config`.
