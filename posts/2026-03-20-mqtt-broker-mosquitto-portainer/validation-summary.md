# Validation Summary: How to Set Up MQTT Broker (Mosquitto) via Portainer

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- MQTT (messaging protocol)
- Eclipse Mosquitto 2.0 (MQTT broker)
- Portainer (Docker management UI)
- Docker / Docker Compose
- paho-mqtt (Python MQTT client library)
- mosquitto-clients (mosquitto_pub, mosquitto_sub, mosquitto_passwd CLI tools)
- TLS / WebSockets

## Sources Consulted
- Mosquitto configuration reference: https://mosquitto.org/man/mosquitto-conf-5.html
- Mosquitto broker man page (incl. `$SYS` topics): https://mosquitto.org/man/mosquitto-8.html
- Eclipse Mosquitto Docker Hub: https://hub.docker.com/_/eclipse-mosquitto
- paho-mqtt Python library migration docs (v1 → v2): https://eclipse.dev/paho/files/paho.mqtt.python/html/migrations.html
- paho-mqtt PyPI: https://pypi.org/project/paho-mqtt/
- Compose file format reference: https://docs.docker.com/compose/compose-file/

## Issues Found

1. **`mosquitto_passwd` Docker command lost the password file.** The original command `docker run --rm -it eclipse-mosquitto:2.0 mosquitto_passwd -c /mosquitto/config/passwd iot-client` writes the password file inside the ephemeral container, which is then deleted by `--rm`. The trailing comment told the reader to "copy the file" but no such copy is possible after the container is gone. **Fix:** added a `-v /opt/mosquitto/config:/mosquitto/config` bind-mount so the file is created directly on the host, and updated the comment to reflect that.

2. **WebSocket port exposed without listener configuration.** The Compose file mapped port `9001:9001` with the comment "MQTT over WebSocket", but `mosquitto.conf` had no corresponding `listener 9001` / `protocol websockets` directives, so the broker would not actually serve WebSocket clients on that port. **Fix:** added `listener 9001` followed by `protocol websockets` to `mosquitto.conf` so the exposed port is functional.

3. **paho-mqtt Python example used deprecated/broken patterns.** Two problems:
   - `mqtt.Client()` (no arguments) is deprecated in paho-mqtt 2.0+ and emits a `DeprecationWarning`; the `callback_api_version` argument is required.
   - The script called `connect()` then `publish()` with QoS 1 and exited without running the network loop. Without `loop_start()` / `loop_forever()`, the PUBLISH packet sits in the outgoing buffer and the PUBACK is never read — the message is typically not transmitted at all.
   
   **Fix:** instantiated the client with `mqtt.CallbackAPIVersion.VERSION2`, added `client.loop_start()`, captured the `MQTTMessageInfo` from `publish()`, called `info.wait_for_publish()`, then cleanly stopped the loop and disconnected.

## Review Notes
- The `mosquitto.conf` placement of `allow_anonymous false` and `password_file` after the `listener 1883` block is harmless given Mosquitto 2.0's default `per_listener_settings false`, under which security options apply globally regardless of position. Convention is to put them at the top of the file, but this is a style preference — left as-is.
- `max_connections 1000` appearing after the second `listener` block applies to that listener (port 8883) rather than globally; this matches the per-listener semantics of that directive in Mosquitto 2.0. Acceptable for the example.
- Compose file format `version: "3.8"` is now considered obsolete by recent Compose specs, but is still accepted and widely used. Not changed.
- For production, consider `tls_version tlsv1.3` rather than `tlsv1.2` if all clients support it; `tlsv1.2` is still valid and more compatible, so left as written.
- The `\$SYS` shell escape in the `mosquitto_sub` example is correct for bash (prevents `$SYS` from being expanded as an environment variable).
