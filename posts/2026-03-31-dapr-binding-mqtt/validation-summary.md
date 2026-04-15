# Validation Summary: How to Use Dapr MQTT3 Binding for IoT Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (runtime and component model)
- MQTT3 binding component (`bindings.mqtt3`)
- Eclipse Mosquitto MQTT broker
- Node.js / Express (input binding handler)
- Python / Flask (input binding handler)
- Docker

## Sources Consulted
- Dapr MQTT3 binding official documentation: https://docs.dapr.io/reference/components-reference/supported-bindings/mqtt3/
- Dapr components-contrib source code for MQTT3 binding (`bindings/mqtt3/mqtt.go`, `bindings/mqtt3/metadata.go`)
- Dapr bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Eclipse Mosquitto Docker Hub page

## Issues Found

1. **Wrong metadata field name `clientID` (component config):** The blog used `clientID` but the correct Dapr metadata field name is `consumerID` (the Go struct field is `ClientID` but its mapstructure tag is `consumerID`). Changed `clientID` to `consumerID`.

2. **Deprecated `qos` metadata field (component config):** The blog included `qos: "1"` in the component metadata. The `qos` field is deprecated and ignored in the current Dapr MQTT3 binding — QoS is hardcoded to 1. Removed the `qos` field from the component config to avoid implying it is configurable.

3. **Unsupported per-request metadata `retain` and `qos` (output binding curl command):** The blog showed `"retain": "false"` and `"qos": "1"` in the request metadata of the output binding invocation. Only `topic` is read from per-request metadata; `retain` and `qos` are ignored. Removed both fields from the request metadata, keeping only `topic`.

4. **Wrong TLS metadata field names:** The blog used `caPath`, `certPath`, and `keyPath` which do not exist. The correct field names are `caCert`, `clientCert`, and `clientKey`. Fixed all three field names.

5. **TLS fields expect PEM content, not file paths:** The blog showed file paths (e.g., `/certs/ca.pem`) as values for TLS fields. The Dapr MQTT3 binding expects inline PEM-formatted certificate/key content, not file paths. Updated the values to show PEM content placeholders.

6. **Non-existent `insecureSkipVerify` field:** The blog included `insecureSkipVerify: "false"` which is not a supported metadata field in the Dapr MQTT3 binding. Removed this field entirely.

7. **Summary text referenced configurable QoS:** The summary paragraph mentioned configuring "the QoS level in the component YAML." Since QoS is hardcoded and not configurable, removed this reference.

## Review Notes
- Wildcard topics (`+` and `#`) shown in the blog are standard MQTT features and will work because Dapr passes the topic string directly to the underlying Paho MQTT library. However, this is not explicitly documented in the official Dapr MQTT3 binding docs, so readers should be aware it relies on the underlying library behavior.
- The `cleanSession` default in the Dapr source is `false`, not `true`. The blog sets it to `"true"` which is a valid explicit choice but readers should know the default differs.
- The Docker command for Mosquitto uses `eclipse-mosquitto:latest`. Recent versions of Mosquitto (2.0+) require a configuration file to allow anonymous connections. Users may need to add `-v mosquitto.conf:/mosquitto/config/mosquitto.conf` with appropriate config for the example to work out of the box.
