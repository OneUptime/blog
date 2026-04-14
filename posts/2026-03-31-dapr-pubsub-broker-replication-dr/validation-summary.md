# Validation Summary: How to Configure Pub/Sub Broker Replication for Dapr DR

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pub/sub component, publish API)
- Apache Kafka (MirrorMaker 2, consumer groups, CLI tools)
- Strimzi Kafka Operator (KafkaMirrorMaker2 CRD, v1beta2 API)
- Redis (Streams, REPLICAOF replication)
- Kubernetes (custom resource definitions, secrets)

## Sources Consulted
- Strimzi KafkaMirrorMaker2 CRD documentation and official examples (strimzi-kafka-operator v0.40+)
- Strimzi CRD schema for `KafkaMirrorMaker2` (`spec.connectCluster` must match a `clusters[].alias`)
- Dapr Kafka pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr pub/sub publish API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Apache Kafka CLI tool documentation (kafka-consumer-groups.sh, kafka-console-consumer.sh)
- Redis command reference for REPLICAOF, XLEN

## Issues Found
1. **`spec.connectCluster` value mismatch in KafkaMirrorMaker2 config**: The `connectCluster` field was set to `"dr-cluster"`, but this value must exactly match one of the `spec.clusters[].alias` values. The defined aliases are `"primary"` and `"dr"`, so `"dr-cluster"` would cause a validation error when applying the resource. Fixed to `"dr"`.

## Review Notes
- The Strimzi `apiVersion: kafka.strimzi.io/v1beta2` is correct for Strimzi versions up to ~0.44. Strimzi 0.46+ introduced `kafka.strimzi.io/v1` with a restructured spec (using `spec.target` and `spec.mirrors[].source`). A note about this migration path could be useful in the future.
- The `topics` field in `sourceConnector.config` uses a comma-separated format which is acceptable for MirrorMaker 2's `MirrorSourceConnector` configuration.
- All Dapr component metadata field names (`brokers`, `consumerGroup`, `authType`, `clientCert`, `clientKey`) and the publish API URL format are verified correct.
- All Kafka CLI commands use correct flags and syntax.
- All Redis commands (`REPLICAOF`, `XLEN`, `REPLICAOF NO ONE`) are syntactically correct.
- MirrorMaker 2 topic naming conventions (`primary.test-topic`, `primary.checkpoints.internal`) correctly reflect the `<source-alias>.<topic>` pattern.
