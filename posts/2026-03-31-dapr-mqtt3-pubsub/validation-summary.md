# Validation Summary: How to Configure Dapr with MQTT3 Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- MQTT3 (version 3.1.1) via `pubsub.mqtt3` component
- Eclipse Mosquitto MQTT broker
- Kubernetes (Deployment, Service, ConfigMap)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Mosquitto CLI tools (`mosquitto_pub`, `mosquitto_sub`)

## Sources Consulted
- Dapr MQTT3 pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-mqtt3/
- Dapr supported pub/sub components list: https://docs.dapr.io/reference/components-reference/supported-pubsub/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/
- Dapr JS SDK GitHub repository and examples: https://github.com/dapr/js-sdk
- npm package `@dapr/dapr`: https://www.npmjs.com/package/@dapr/dapr

## Issues Found

1. **`clientID` metadata field does not exist; should be `consumerID`.**
   The post used `clientID` as a metadata field name in the Dapr MQTT3 component configuration. The correct field name per the official Dapr documentation is `consumerID`. Changed `clientID` to `consumerID`.

2. **`backOffMaxRetries` metadata field does not exist.**
   The post included a `backOffMaxRetries` metadata field. This field is not documented in the Dapr MQTT3 pub/sub component spec. The MQTT3 component has no built-in retry metadata; retries should be handled via Dapr resiliency policies. Removed the field.

3. **TLS URL scheme `tls://` should be `ssl://`.**
   The post used `tls://` as the URL scheme for TLS-secured MQTT connections. The Dapr documentation specifies `ssl://` as the correct URI scheme for TLS communication. Changed `tls://` to `ssl://`.

4. **`username` and `password` are not valid separate metadata fields.**
   The post showed `username` and `password` as separate metadata entries for MQTT authentication. The `pubsub.mqtt3` component does not have these as standalone metadata fields — credentials should be embedded in the URL (e.g., `ssl://user:pass@host:port`). Replaced with the documented TLS certificate fields (`caCert`, `clientCert`, `clientKey`) using `secretKeyRef`.

## Review Notes
- The Kubernetes Mosquitto deployment and ConfigMap are correct and functional for development/testing purposes. The `allow_anonymous true` setting is appropriate for a tutorial but should be noted as insecure for production.
- The JavaScript SDK API usage (`DaprClient`, `DaprServer`, `pubsub.publish`, `pubsub.subscribe`) is verified correct against the official Dapr JS SDK.
- MQTT wildcard topic usage (`+` single-level, `#` multi-level) is correct per the MQTT 3.1.1 specification.
- QoS level descriptions (0 = at most once, 1 = at least once, 2 = exactly once) are accurate.
- The `cleanSession` default in Dapr is `"false"`, but the post explicitly sets it to `"true"`, which is a valid configuration choice, not an error.
