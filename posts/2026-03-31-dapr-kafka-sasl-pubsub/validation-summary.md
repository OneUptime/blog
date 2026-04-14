# Validation Summary: How to Configure Kafka SASL Authentication for Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Apache Kafka (SASL authentication)
- Dapr (pub/sub component for Kafka)
- Kubernetes (secrets, pod deployment)
- Python (Dapr SDK)
- OpenSSL (password generation)

## Sources Consulted
- Dapr Kafka Pub/Sub Component Reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Subscription Schema Reference: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Python SDK Documentation: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Apache Kafka Security Documentation (SASL configuration): https://kafka.apache.org/documentation/#security_sasl

## Issues Found

1. **Incorrect TLS field name (`tlsEnabled` → `disableTls`)**: The post used `tlsEnabled: "true"` in both YAML configurations. The correct Dapr Kafka component metadata field is `disableTls` with inverted logic — set to `"false"` to keep TLS enabled (which is the default). Changed in both the SASL/PLAIN and SASL/SCRAM-SHA-512 configuration examples.

2. **Incorrect TLS skip verify field name (`tlsSkipVerify` → `skipVerify`)**: The SCRAM-SHA-512 example used `tlsSkipVerify`. The correct Dapr metadata field name is `skipVerify`. Changed in the SCRAM-SHA-512 configuration example.

3. **Incorrect SASL mechanism values**: The post used `"PLAIN"` and `"SCRAM-SHA-512"` as `saslMechanism` values. The Dapr Kafka component accepts `"PLAINTEXT"`, `"SHA-256"`, and `"SHA-512"` as mechanism values. Changed `"PLAIN"` to `"PLAINTEXT"` and `"SCRAM-SHA-512"` to `"SHA-512"` in the respective YAML examples.

4. **Deprecated Subscription API version**: The subscription manifest used `apiVersion: dapr.io/v1alpha1` with the `route` field. The v1alpha1 subscription spec is deprecated; the current recommended version is `v2alpha1` which uses `routes` (with a `default` sub-field) instead of `route`. Updated the subscription manifest accordingly.

5. **Summary text referenced incorrect config values**: The summary paragraph referenced the old field names and mechanism values. Updated to match the corrected configuration (`PLAINTEXT`/`SHA-512` and `disableTls: "false"`).

## Review Notes
- The Kafka broker-side `server.properties` and `kafka-configs.sh` commands use standard Apache Kafka terminology (e.g., `SCRAM-SHA-512`, `PLAIN`) which is correct — these are distinct from the Dapr component metadata values.
- The `kafka-configs.sh` command uses `--zookeeper` which works for Kafka versions using ZooKeeper. For KRaft-based Kafka clusters (3.3+), the `--bootstrap-server` flag should be used instead. This is noted as a future consideration, not an error, since ZooKeeper-based deployments are still common.
- The Python SDK `publish_event` usage is correct with the current Dapr Python SDK API.
- The `kubectl create secret` and `kubectl run` commands are syntactically correct.
