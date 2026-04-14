# Validation Summary: How to Use Dapr with Strimzi Kafka on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka
- Strimzi Kafka Operator
- Dapr (Distributed Application Runtime)
- Kubernetes
- Dapr Pub/Sub building block

## Sources Consulted
- Strimzi documentation: https://strimzi.io/docs/operators/latest/overview
- Strimzi Kafka CRD reference: https://strimzi.io/docs/operators/latest/configuring#type-Kafka-reference
- Strimzi KafkaTopic CRD reference: https://strimzi.io/docs/operators/latest/configuring#type-KafkaTopic-reference
- Strimzi quickstart: https://strimzi.io/quickstarts/
- Dapr Kafka pub/sub component docs: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr publish API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr declarative subscription docs: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/#declarative-subscriptions
- Dapr Kubernetes annotations: https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found
No technical issues found.

## Review Notes
- The Kafka cluster uses ZooKeeper mode, which is still supported but Strimzi also supports KRaft mode for newer deployments. Future readers deploying on Kafka 3.7+ may want to consider KRaft mode as the ZooKeeper-less alternative.
- The monitoring section title references "Strimzi Kafka Exporter" but the applied YAML (`kafka-metrics.yaml`) configures JMX-based Prometheus metrics rather than deploying the dedicated Kafka Exporter component (which is configured via `.spec.kafkaExporter` in the Kafka CR). Both approaches provide Prometheus metrics, so this is not incorrect but could be more precise.
- All Kubernetes resource manifests, Dapr component configurations, CLI commands, and API endpoints are syntactically and semantically correct for current versions of Strimzi and Dapr.
