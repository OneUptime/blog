# Validation Summary: How to Deploy Apache Kafka on Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apache Kafka
- Kubernetes
- Strimzi Operator 0.44.0
- Strimzi Kafka, KafkaNodePool, KafkaTopic, and KafkaUser custom resources
- KRaft mode
- Helm
- kubectl
- confluent-kafka Python producer
- Prometheus JMX exporter configuration

## Sources Consulted
- Strimzi 0.44.0 Deploying and Managing documentation: https://strimzi.io/docs/operators/0.44.0/deploying.html
- Strimzi 0.44.0 KRaft examples: https://github.com/strimzi/strimzi-kafka-operator/tree/0.44.0/examples/kafka/kraft
- Strimzi downloads and supported Kubernetes/Kafka versions: https://strimzi.io/downloads/
- Strimzi 0.44.0 metrics example: https://github.com/strimzi/strimzi-kafka-operator/blob/0.44.0/examples/metrics/kafka-metrics.yaml
- Apache Kafka producer configuration documentation: https://kafka.apache.org/38/documentation.html#producerconfigs
- Apache Kafka authorization and ACL documentation: https://kafka.apache.org/documentation/#security_authz
- Confluent Python client documentation: https://docs.confluent.io/kafka-clients/python/current/overview.html

## Issues Found
- The post described a KRaft deployment but used a ZooKeeper-era single `Kafka` resource with `spec.kafka.replicas` and `spec.kafka.storage`. Updated the manifest to include a `KafkaNodePool`, required `strimzi.io/node-pools: enabled` and `strimzi.io/kraft: enabled` annotations, and a compatible Kafka 3.8.0 metadata version.
- The architecture diagram referenced ZooKeeper and Kubernetes StatefulSets. Updated it to reflect Strimzi 0.44 KRaft behavior with KafkaNodePool and StrimziPodSet-managed pods.
- The prerequisite said Kubernetes v1.25 or later, but Strimzi 0.44.0 documents support through Kubernetes v1.31. Updated the range.
- The KafkaUser configured SCRAM-SHA-512, but the Kafka listener and client did not use SCRAM authentication. Added SCRAM listener authentication, simple authorization, Python SASL settings, and commands to apply the user and retrieve the generated password.
- The idempotent producer had only topic ACLs. Added the cluster-level `IdempotentWrite` ACL required for idempotent writes when authorization is enabled.
- The monitoring ConfigMap was referenced but no apply command was shown. Added the `kubectl apply` command.
- The scaling example patched `Kafka.spec.kafka.replicas`, which is not the right control point for a KRaft node-pool deployment. Updated it to patch the `KafkaNodePool`.
- The post claimed the operator automatically handles partition reassignment after scaling. Updated the note to say existing partitions need a KafkaRebalance/Cruise Control workflow or Kafka's reassignment tool.

## Review Notes
The tutorial remains pinned to Strimzi 0.44.0. That version is technically valid for the versions shown, but future maintenance should consider updating the operator and Kafka versions together by following Strimzi's documented upgrade path.
