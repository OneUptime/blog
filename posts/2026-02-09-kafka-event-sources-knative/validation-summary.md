# Validation Summary: How to Set Up Kafka Event Sources for Knative Eventing on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Knative Eventing
- Knative Serving
- Knative KafkaSource
- Apache Kafka
- CloudEvents
- Node.js
- Express

## Sources Consulted
- Knative documentation: Apache Kafka Source, https://knative.dev/docs/eventing/sources/kafka-source/
- Knative documentation: Install Eventing with YAML, https://knative.dev/docs/install/yaml-install/eventing/install-eventing-with-yaml/
- Knative Eventing Kafka Broker release manifests and KafkaSource CRD, https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.22.1/eventing-kafka-controller.yaml
- Knative Eventing Kafka Source release manifest, https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.22.1/eventing-kafka-source.yaml
- Kubernetes kubectl command reference, https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The KafkaSource installation used the obsolete `knative-sandbox/eventing-kafka` `source.yaml` path. Updated it to the current Knative Kafka extension manifests: `eventing-kafka-controller.yaml` and `eventing-kafka-source.yaml`.
- The KafkaSource examples used `sources.knative.dev/v1beta1`. Updated them to `sources.knative.dev/v1`, matching current Knative documentation.
- The post created a Kafka connection ConfigMap that KafkaSource did not consume and that implied unsupported generic Kafka client configuration. Removed the ConfigMap example and clarified that broker addresses belong in `spec.bootstrapServers`, while credentials and certificates belong in Secrets referenced by `spec.net`.
- The Secret example omitted the `sasl.mechanism` key referenced later by the authenticated KafkaSource. Added it.
- The Node.js example read non-documented Kafka metadata headers such as `ce-kafkatopic`, `ce-kafkapartition`, and `ce-kafkaoffset`. Updated it to use CloudEvent attributes documented for KafkaSource output, including `ce-source`, `ce-subject`, and `ce-key`.
- The scaling example used unsupported `spec.config` Kafka consumer properties. Replaced it with the supported `spec.initialOffset` field.
- The troubleshooting log command used a source-specific adapter label that does not match the current shared KafkaSource dispatcher deployment model. Updated it to read logs from `statefulset/kafka-source-dispatcher`.
- The best practices section recommended tuning raw Kafka consumer timeout and poll interval properties through KafkaSource. Reworded it to recommend supported delivery retries, dead letter sinks, and consumer lag monitoring.

## Review Notes
- JavaScript syntax was checked with Node.js parsing.
- YAML snippets were parsed with PyYAML.
- `ruby` was not available in the local environment, so YAML validation used Python instead.
