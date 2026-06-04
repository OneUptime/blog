# Validation Summary: How to Run Mosquitto MQTT Broker in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Eclipse Mosquitto MQTT broker
- MQTT 5.0, 3.1.1, and 3.1
- Docker and Docker Compose
- Mosquitto configuration files
- Mosquitto CLI tools: mosquitto_pub, mosquitto_sub, and mosquitto_passwd
- TLS with OpenSSL certificates
- Mosquitto ACLs and password authentication
- Mosquitto broker bridging
- Prometheus monitoring with sapcc/mosquitto-exporter

## Sources Consulted
- Eclipse Mosquitto Docker Official Image documentation: https://hub.docker.com/_/eclipse-mosquitto/
- Eclipse Mosquitto migration guide for 2.0 listener and authentication behavior: https://mosquitto.org/documentation/migrating-to-2-0/
- Eclipse Mosquitto mosquitto.conf manual: https://mosquitto.org/man/mosquitto-conf-5.html
- Eclipse Mosquitto mosquitto_pub manual: https://mosquitto.org/man/mosquitto_pub-1.html
- Eclipse Mosquitto mosquitto_sub manual: https://mosquitto.org/man/mosquitto_sub-1.html
- Eclipse Mosquitto mosquitto_passwd manual: https://mosquitto.org/man/mosquitto_passwd-1.html
- Docker Compose file reference for the obsolete top-level version element: https://docs.docker.com/reference/compose-file/version-and-name/
- sapcc/mosquitto-exporter usage documentation: https://pkg.go.dev/github.com/sapcc/mosquitto-exporter
- Local OpenSSL 3.0.13 command validation for the certificate generation commands.

## Issues Found
- The quick-start command published port 9001 even though the default Mosquitto image does not enable a WebSocket listener. Removed the 9001 port mapping from the default run command and clarified that port 9001 is used by the later WebSocket configuration.
- The project setup created `mosquitto-docker/` but later commands used paths relative to that directory. Added `cd mosquitto-docker` after directory creation.
- The Compose examples used the obsolete top-level `version: "3.8"` field. Removed it from the Compose snippets.
- The main Compose snippet mounted only `mosquitto.conf`, which would not persist generated password, ACL, and certificate files under `/mosquitto/config`. Changed it to mount `./config:/mosquitto/config`, matching the official image guidance.
- The command examples used `docker exec mosquitto`, but the Compose service does not create a container named exactly `mosquitto`. Changed those commands to `docker compose exec mosquitto`.
- The ACL example did not allow the monitoring user to read Mosquitto `$SYS/#` broker metrics. Added `topic read $SYS/#` for `webapp`.
- The TLS certificate example generated a certificate for `mqtt.example.com` but tested with `-h localhost`, which would fail hostname verification. Changed the test certificate to include `localhost` and `127.0.0.1` subject alternative names and verified the OpenSSL commands locally.
- The TLS key file generated on the host might not be readable by the unprivileged Mosquitto user in the container. Added a test-only `chmod 644 config/certs/server.key` command.
- The monitoring exporter used `MQTT_BROKER`, but sapcc/mosquitto-exporter expects `BROKER_ENDPOINT`. Updated the environment variable name.

## Review Notes
Docker image runtime validation could not be completed because Docker Hub returned an unauthenticated pull rate limit for `eclipse-mosquitto:2`. The Mosquitto CLI syntax and configuration directives were validated against official Mosquitto manuals, and the OpenSSL certificate generation commands were tested locally.
