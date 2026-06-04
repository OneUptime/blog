# Validation Summary: How to Run EMQX MQTT Broker in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- EMQX 5.7
- MQTT
- MQTT over WebSocket and TLS
- Eclipse Mosquitto client tools
- Python paho-mqtt
- EMQX REST API and CLI
- PostgreSQL

## Sources Consulted
- EMQX Docker Official Image documentation: https://hub.docker.com/_/emqx
- EMQX Configuration Files and environment variables: https://docs.emqx.com/en/emqx/latest/configuration/configuration.html
- EMQX Dashboard configuration: https://docs.emqx.com/en/emqx/latest/configuration/dashboard.html
- EMQX Authentication documentation: https://docs.emqx.com/en/emqx/latest/access-control/authn/authn.html
- EMQX Built-in Database authentication: https://docs.emqx.com/en/emqx/latest/access-control/authn/mnesia.html
- EMQX REST API authentication and API keys: https://docs.emqx.com/en/emqx/latest/admin/api.html
- EMQX CLI reference: https://docs.emqx.com/en/emqx/latest/admin/cli.html
- EMQX cluster creation documentation: https://docs.emqx.com/en/emqx/latest/deploy/cluster/create-cluster.html
- EMQX PostgreSQL data integration documentation: https://docs.emqx.com/en/emqx/latest/data-integration/data-bridge-pgsql.html
- Eclipse Paho MQTT Python client documentation: https://eclipse.dev/paho/files/paho.mqtt.python/html/client.html
- paho-mqtt project documentation: https://pypi.org/project/paho-mqtt/

## Issues Found
- The Python publisher used QoS 1 publishing without running the Paho network loop. Added `client.loop_start()` and `wait_for_publish()` so outgoing QoS 1 traffic is processed reliably.
- The subscriber callback used the older `rc` naming with the Paho `CallbackAPIVersion.VERSION2` signature. Renamed it to `reason_code` to match the current API terminology.
- The authentication Compose example used `EMQX_ALLOW_ANONYMOUS`, which is not the EMQX 5 authentication model. Replaced it with environment variables that configure the built-in password database authenticator.
- The REST API examples used Dashboard credentials with HTTP Basic auth. EMQX 5 requires API keys or bearer tokens for API calls, so the example now creates an API key with `emqx ctl api_keys add` and uses the returned key and secret.
- The built-in database user-management URL used an unencoded authenticator ID. Updated `password_based:built_in_database` to `password_based%3Abuilt_in_database` as required by EMQX API identifier conventions.
- The PostgreSQL section implied the Compose file alone configured EMQX data persistence. Clarified that the Compose file is a foundation and that a PostgreSQL connector, action, and rule are still required in EMQX.
- The management command `emqx ctl metrics` was not the documented EMQX 5 CLI command. Updated it to `emqx ctl broker metrics`.

## Review Notes
- The `version: "3.8"` field in Compose examples is accepted by Docker Compose but is considered obsolete by newer Compose tooling and may produce a warning.
- The `emqx/emqx:5.7` image version is version-specific and older than current EMQX releases, but the reviewed configuration is valid for an EMQX 5.x tutorial pinned to that tag.
