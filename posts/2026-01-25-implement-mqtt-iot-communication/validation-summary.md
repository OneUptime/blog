# Validation Summary: How to Implement MQTT for IoT Communication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- MQTT 3.1.1 and MQTT 5.0
- Eclipse Mosquitto broker
- Mosquitto password files and ACL configuration
- Eclipse Paho MQTT Python client
- Python datetime handling
- TLS certificates with OpenSSL
- MQTT QoS, retained messages, Last Will, topics, and wildcards

## Sources Consulted
- MQTT.org overview: https://mqtt.org/
- OASIS MQTT Version 3.1.1 specification: https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html
- OASIS MQTT Version 5.0 specification: https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html
- Eclipse Mosquitto configuration manual: https://mosquitto.org/man/mosquitto-conf-5.html
- Eclipse Mosquitto password file manual: https://mosquitto.org/man/mosquitto_passwd-1.html
- Eclipse Paho MQTT Python client documentation: https://eclipse.dev/paho/files/paho.mqtt.python/html/client.html
- Eclipse Paho MQTT Python migration guide: https://eclipse.dev/paho/files/paho.mqtt.python/html/migrations.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- OpenSSL x509 documentation: https://docs.openssl.org/3.2/man1/openssl-x509/

## Issues Found
- The ACL examples did not match the publisher topics used later in the post. Updated the sensor ACL entries so the sample devices can publish to the telemetry and retained status topics shown in the Python code.
- The subscriber wildcard and parser expected `sensors/{location}/{sensor-type}/{device-id}/reading`, but the publisher emits `sensors/building-a/floor-1/temperature/{device-id}/reading`. Updated the subscription filter and parser to handle the two-level building/floor location.
- The Paho Python examples used the older callback signatures without specifying a callback API version. Updated the clients to use `mqtt.CallbackAPIVersion.VERSION2` and adjusted `on_connect`, `on_disconnect`, and `on_publish` signatures.
- The Python examples used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with timezone-aware `datetime.now(timezone.utc).isoformat()`.
- The Paho TLS examples explicitly used `ssl.PROTOCOL_TLS`, which is deprecated in modern Python. Removed the explicit protocol value and let Paho use its TLS defaults with the configured CA bundle.
- The OpenSSL server certificate example only set the Common Name. Added a subjectAltName extension to the CSR and copied extensions into the signed certificate so hostname validation works with modern TLS clients.

## Review Notes
The remaining MQTT, Mosquitto, QoS, retained message, Last Will, password-file, ACL syntax, and TLS listener examples align with the consulted official documentation. The Paho examples target MQTT 3.1.1 persistent sessions via `clean_session=False`; MQTT 5.0 clients would use `clean_start` and session expiry instead.
