# Validation Summary: Kafka Broker vs MTChannelBasedBroker in Knative: Durability, Latency, and Operations

## Status
validated

## Post Type
Architecture comparison guide

## Technologies Covered
- Knative Eventing
- Knative Broker and Trigger APIs
- Knative Kafka Broker
- MTChannelBasedBroker
- KafkaChannel
- InMemoryChannel
- Apache Kafka
- Kubernetes
- CloudEvents
- KEDA

## Sources Consulted
- [Knative Broker for Apache Kafka](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Knative channel-based Broker](https://knative.dev/docs/eventing/brokers/broker-types/channel-based-broker/)
- [Knative Channel types and defaults](https://knative.dev/docs/eventing/channels/channel-types-defaults/)
- [Knative available Channels](https://knative.dev/docs/eventing/channels/channels-crds/)
- [Knative Kafka Channel configuration](https://knative.dev/docs/eventing/configuration/kafka-channel-configuration/)
- [Knative event delivery support matrix](https://knative.dev/docs/eventing/event-delivery/)
- [Knative Kafka installation and delivery guarantees](https://knative.dev/docs/install/eventing/kafka-install/)
- [Knative KEDA autoscaling configuration](https://knative.dev/docs/eventing/configuration/keda-configuration/)
- [Knative Eventing threat model](https://knative.dev/docs/reference/security/threat-model/)
- [CloudEvents Kafka protocol binding](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/bindings/kafka-protocol-binding.md)
- [Apache Kafka topic configuration](https://kafka.apache.org/43/configuration/topic-configs/)
- [Apache Kafka producer configuration](https://kafka.apache.org/43/generated/producer_config.html)

## Issues Found
- The post said that an InMemoryChannel loses its buffered state when its dispatcher restarts. That wording implied a defined in-memory buffer and restart-specific loss behavior that the official documentation does not promise. It was changed to the documented guarantee: InMemoryChannel is a best-effort Channel with no persistent backing store and must not be used in production.

## Review Notes
- The Broker manifests use the current `eventing.knative.dev/v1` API, the documented case-sensitive `Kafka` and `MTChannelBasedBroker` classes, and valid ConfigMap references.
- The KafkaChannel template correctly uses the currently documented `messaging.knative.dev/v1beta1` API with `numPartitions` and `replicationFactor`. Operators should continue matching this API version to the CRD installed by their chosen Knative Kafka release.
- The Kafka Broker topic settings, external-topic annotation, binary CloudEvents representation, ordering annotation, shared and namespaced data-plane descriptions, and at-least-once delivery claim match the current official documentation.
- KEDA-based dispatcher autoscaling is still documented as an alpha feature.
