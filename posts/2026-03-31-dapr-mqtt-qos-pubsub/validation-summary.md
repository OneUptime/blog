# Validation Summary: How to Configure MQTT QoS Levels for Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (pub/sub building block)
- MQTT protocol (QoS 0, 1, 2)
- Dapr MQTT3 pub/sub component (`pubsub.mqtt3`)
- Dapr Python SDK (`dapr-client`)
- Dapr declarative subscriptions
- TLS/mTLS for MQTT connections

## Sources Consulted
- Dapr MQTT3 pub/sub component specification: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-mqtt3/
- Dapr MQTT pub/sub component specification: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-mqtt/
- Dapr Python SDK documentation: https://dapr.github.io/python-sdk/
- MQTT v3.1.1 specification (QoS levels 0, 1, 2)

## Issues Found

1. **`clientId` metadata field incorrect (line 42)**: The blog used `clientId` but the correct Dapr MQTT3 metadata field name is `consumerID`. Fixed to `consumerID`.

2. **`backOffMaxRetries` is not a valid metadata field (line 44)**: The MQTT3 component does not support a `backOffMaxRetries` metadata field. Retry logic in Dapr should be configured via a separate resiliency policy, not component metadata. Removed the field.

3. **`username`/`password` shown as separate metadata fields (lines 140-149)**: The Dapr MQTT3 component does not support standalone `username` and `password` metadata entries. Authentication credentials must be embedded in the broker URL using the format `tcp://[username][:password]@host:port`. Replaced the section with the correct URL-embedded credential approach.

4. **Subscription apiVersion `dapr.io/v1alpha1` is deprecated (line 154)**: The declarative subscription format used `apiVersion: dapr.io/v1alpha1` with a `route` field, which is deprecated. Updated to `apiVersion: dapr.io/v2alpha1` with the current `routes.default` structure.

## Review Notes
- The MQTT QoS level descriptions (QoS 0 = at most once, QoS 1 = at least once, QoS 2 = exactly once) are accurate per the MQTT specification.
- The Python SDK `publish_event` usage with `pubsub_name`, `topic_name`, `data`, and `data_content_type` parameters is correct.
- The TLS configuration using `caCert`, `clientCert`, and `clientKey` with `secretKeyRef` is correct.
- The MQTT wildcard topic explanation (`+` for single-level, `#` for multi-level) is accurate.
- The advice about using `cleanSession: "false"` with QoS 1/2 for durable subscriptions is correct.
- The `ssl://` URL scheme for TLS MQTT connections is correct per the Dapr docs.
