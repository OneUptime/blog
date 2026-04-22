# Validation Summary: How to Deploy Sensor Data Collection Pipelines with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Docker Compose
- Eclipse Mosquitto
- MQTT and MQTT over WebSocket
- Telegraf MQTT consumer and JSON parser
- InfluxDB 2.x
- Grafana
- Python Paho MQTT client

## Sources Consulted
- Portainer stack web editor documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Docker Compose version element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- Eclipse Mosquitto Docker image documentation: https://hub.docker.com/_/eclipse-mosquitto/
- Eclipse Mosquitto 2.0 listener security changes: https://projects.eclipse.org/projects/iot.mosquitto/releases/2.0
- Mosquitto configuration manual: https://mosquitto.org/man/mosquitto-conf-5.html
- InfluxDB OSS v2 Docker Compose installation documentation: https://docs.influxdata.com/influxdb/v2/install/use-docker-compose/
- InfluxDB OSS v2 Docker installation documentation: https://docs.influxdata.com/influxdb/v2/install/
- Telegraf MQTT consumer input plugin documentation: https://docs.influxdata.com/telegraf/v1/input-plugins/mqtt_consumer/
- Telegraf JSON input data format documentation: https://docs.influxdata.com/telegraf/v1/data_formats/input/json/
- Telegraf InfluxDB v2 output plugin documentation: https://docs.influxdata.com/telegraf/v1/output-plugins/influxdb_v2/
- Grafana InfluxDB data source guide: https://grafana.com/docs/grafana/latest/fundamentals/getting-started/first-dashboards/get-started-grafana-influxdb/
- Eclipse Paho Python client API documentation: https://eclipse.dev/paho/files/paho.mqtt.python/html/client.html
- Eclipse Paho Python 2.0 migration documentation: https://eclipse.dev/paho/files/paho.mqtt.python/html/migrations.html

## Issues Found
- The Compose example used the obsolete top-level `version: "3.8"` key. Removed it to match the current Compose specification.
- The Mosquitto service exposed MQTT and WebSocket ports but did not provide a Mosquitto configuration. Mosquitto 2.x requires explicit listener and anonymous-authentication choices for network listeners, and WebSocket support requires a listener with `protocol websockets`. Added a `mosquitto.conf` example, bind-mounted it into the container, removed the unused `mosquitto-config` volume, and added a production authentication caution.
- The InfluxDB setup did not initialize a known API token while Telegraf used a placeholder token. Added `DOCKER_INFLUXDB_INIT_ADMIN_TOKEN` and used the same token value in the Telegraf output plugin.
- The Telegraf topic parsing did not match the Python publisher topic (`sensors/building-a/data`) and used an incorrect tag mapping for the example. Updated topic parsing to extract a `location` tag from `sensors/+/data`.
- The Telegraf JSON parser ignored the string `device_id` by default and treated the payload timestamp as a normal field. Added `tag_keys = ["device_id"]`, `json_time_key = "timestamp"`, and `json_time_format = "unix"`.
- The Python publisher used the deprecated default Paho callback API, did not run a Paho network loop, and connected to `localhost` despite being described as running on a sensor device. Updated the client to `CallbackAPIVersion.VERSION2`, added `loop_start()`, and changed the broker host example to the Mosquitto host.
- The summary implied Telegraf could be scaled directly for throughput. Reworded it to specify shared MQTT subscriptions or partitioned topics, avoiding duplicate ingestion from multiple identical consumers.

## Review Notes
- The stack still uses pinned older image tags (`telegraf:1.29`, `influxdb:2.7`, and `grafana/grafana:10.3.0`). They are valid for the tutorial, but a future refresh should evaluate newer supported releases.
- Docker Compose `depends_on` controls startup order, not service readiness. The restart policy should let Telegraf recover if Mosquitto or InfluxDB is not ready immediately, but production stacks may want health checks.
- Local runtime validation was not run because Docker is not installed in this environment.
