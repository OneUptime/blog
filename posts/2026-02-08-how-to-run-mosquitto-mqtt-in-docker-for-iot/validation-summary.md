# Validation Summary: How to Run Mosquitto MQTT in Docker for IoT

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Eclipse Mosquitto
- MQTT
- Docker
- Docker Compose
- Mosquitto CLI tools
- TLS
- Mosquitto ACL files

## Sources Consulted
- Eclipse Mosquitto mosquitto.conf manual: https://mosquitto.org/man/mosquitto-conf-5.html
- Eclipse Mosquitto mosquitto_passwd manual: https://mosquitto.org/man/mosquitto_passwd-1.html
- Eclipse Mosquitto mosquitto_pub manual: https://mosquitto.org/man/mosquitto_pub-1.html
- Eclipse Mosquitto mosquitto_sub manual: https://mosquitto.org/man/mosquitto_sub-1.html
- Eclipse Mosquitto Docker Official Image documentation: https://hub.docker.com/_/eclipse-mosquitto/
- Docker Compose file reference for the top-level version element: https://docs.docker.com/reference/compose-file/version-and-name/
- OASIS MQTT Version 5.0 specification: https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html

## Issues Found
- The Docker Compose example used the top-level `version: "3.8"` field. Docker Compose now treats this field as obsolete and informational, so it was removed from the snippet.
- The wildcard subscription examples omitted authentication even though the broker configuration sets `allow_anonymous false`. Added `-u homeassistant -P your_password` to those examples.
- The retained-message example used `sensor_user` to publish to `home/thermostat/status`, but the ACL example did not permit that topic. Added `topic write home/+/status` for `sensor_user`.
- The ACL example granted `homeassistant` `topic readwrite #`, but MQTT wildcard matching with `#` does not cover `$SYS/#` topics. Added `topic read $SYS/#` so the monitoring command works after ACLs are enabled.

## Review Notes
The Mosquitto listener, persistence, logging, password file, ACL, TLS, and client command options were checked against current Mosquitto documentation. The TLS example is valid for certificate-based TLS; deployments using publicly trusted certificates may choose to rely on OS trust stores or provide the relevant CA file to clients.
