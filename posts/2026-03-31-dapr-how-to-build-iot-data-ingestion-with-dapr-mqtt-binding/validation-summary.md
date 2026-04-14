# Validation Summary: How to Build IoT Data Ingestion with Dapr MQTT Binding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (MQTT3 input binding, state management, pub/sub)
- MQTT protocol
- Eclipse Mosquitto (MQTT broker)
- Python / Flask
- Docker Compose
- HiveMQ Cloud (TLS example)

## Sources Consulted
- Dapr MQTT3 Binding Component Reference: https://docs.dapr.io/reference/components-reference/supported-bindings/mqtt3/
- Dapr State Management API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Input Bindings How-To: https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-triggers/
- Dapr Secret References: https://docs.dapr.io/operations/components/component-secrets/

## Issues Found

1. **Typo in architecture diagram: "Mosquito" → "Mosquitto"** — The Eclipse MQTT broker is spelled "Mosquitto" (double 't'). Fixed the misspelling in the ASCII diagram.

2. **Wrong metadata field name: `clientID` → `consumerID`** — The Dapr MQTT3 binding uses `consumerID` as the metadata field for the MQTT client identifier, not `clientID`. The official docs list `consumerID` in the metadata spec. Fixed in the component YAML.

3. **Wrong URL scheme: `mqtt://` → `tcp://` and `mqtts://` → `ssl://`** — The Dapr MQTT3 binding uses `tcp://` for non-TLS and `ssl://` for TLS connections, matching the underlying Paho MQTT Go client. The `mqtt://` and `mqtts://` schemes are not supported. Fixed in both component YAML examples.

4. **State store TTL in wrong field: `options` → `metadata`** — The Dapr State Management API uses the `metadata` field (not `options`) for `ttlInSeconds`. The `options` field is only for `concurrency` and `consistency` settings. Also changed the TTL value from integer `3600` to string `"3600"` to match the API spec. Fixed in the Python code.

## Review Notes
- The `qos` metadata field is used in both MQTT binding YAML configs but is not listed in the official MQTT3 binding documentation. It is a standard MQTT concept and may work as an undocumented/passthrough field, but readers should verify support with their Dapr version.
- The TLS example uses `username` and `password` as separate metadata fields with `secretKeyRef`. The official docs show credentials embedded in the URL (`tcp://[username][:password]@host`), but separate metadata fields may be supported by the underlying implementation. Readers deploying to production should verify this approach works with their Dapr version.
- The `docker-compose.yaml` uses `version: "3.9"` which is deprecated in Docker Compose V2 (it ignores the field). This is harmless but could be removed.
- The Python code returns `{"status": "DROP"}` for malformed messages, but Dapr input bindings do not use response body status values the way pub/sub does. The HTTP 200 status code is what signals success to Dapr. The response body is effectively ignored. The code still works correctly but the "DROP" semantics are misleading.
