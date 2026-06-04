# Validation Summary: How to Implement Knative Eventing Broker and Trigger Patterns for Event Routing

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes
- Knative Eventing
- Knative Serving
- Knative Brokers and Triggers
- CloudEvents HTTP binding
- Apache Kafka Source for Knative
- PingSource
- Python Flask
- Prometheus Python client

## Sources Consulted
- Knative Eventing YAML installation documentation: https://knative.dev/v1.21-docs/install/yaml-install/eventing/install-eventing-with-yaml/
- Knative Serving YAML installation documentation: https://knative.dev/v1.21-docs/install/yaml-install/serving/install-serving-with-yaml/
- Knative Broker creation documentation: https://knative.dev/docs/eventing/brokers/create-broker/
- Knative Channel based Broker documentation: https://knative.dev/v1.20-docs/eventing/brokers/broker-types/channel-based-broker/
- Knative Trigger documentation: https://knative.dev/docs/eventing/triggers/
- Knative KafkaSource documentation: https://knative.dev/v1.20-docs/eventing/sources/kafka-source/
- Knative PingSource documentation: https://knative.dev/docs/eventing/sources/ping-source/
- Knative delivery failure documentation: https://knative.dev/docs/eventing/event-delivery/
- CloudEvents HTTP protocol binding: https://github.com/cloudevents/spec/blob/main/cloudevents/bindings/http-protocol-binding.md

## Issues Found
- The installation commands used Knative Eventing v1.12.0, which is outdated for a 2026 tutorial. Updated the Eventing manifests to v1.21.3 and added the current KafkaSource extension manifests used by the KafkaSource example.
- The examples deploy `serving.knative.dev/v1` Knative Services, but the install section did not install Knative Serving or a Serving networking layer. Added Serving v1.21.2 installation commands and Kourier configuration from the official Serving YAML installation docs.
- The Broker manifest hardcoded `spec.config` to `config-br-default-channel`. Current Broker creation docs show that a Broker can use the default Broker class and configuration from `config-br-defaults`; the hardcoded config can be unnecessary or version-sensitive. Removed the explicit `spec.config`.
- Trigger examples used the legacy `filter.attributes` syntax. It still works for backwards compatibility, but current Knative documentation recommends the `filters` field with the `exact` dialect where possible. Updated Trigger examples to `filters: - exact:`.
- The "high-value order" examples implied filtering on the JSON event body, but Knative Trigger filters match CloudEvents attributes and extensions, not the `data` body. Updated the comments, trigger name, and subscriber name to avoid claiming body-based filtering.
- The KafkaSource snippet used `apiVersion: sources.knative.dev/v1beta1`; current Knative KafkaSource examples use `sources.knative.dev/v1`. Updated the API version.
- The Python Flask example called `uuid.uuid4()` without importing `uuid`. Added `import uuid`.
- The Prometheus monitoring snippet referenced an undefined `handle_event` function and would exit after starting the metrics server. Added a minimal handler placeholder and kept the process alive with a sleep loop.

## Review Notes
- The direct broker URL format used in the examples matches Knative Broker status URL examples for the MTChannelBasedBroker.
- The dead letter queue example uses valid DeliverySpec fields, but support for delivery settings on the MTChannelBasedBroker depends on the underlying Channel implementation. The tutorial uses InMemoryChannel for development, which supports the shown fields.
- The InMemoryChannel-backed broker remains suitable for development examples only and should not be used for production event delivery.
