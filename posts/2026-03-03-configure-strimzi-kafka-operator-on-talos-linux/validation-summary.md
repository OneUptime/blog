# Validation Summary: How to Configure Strimzi Kafka Operator on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Strimzi Kafka Operator
- Apache Kafka (3.7.0)
- KRaft mode (KafkaNodePool)
- ZooKeeper-based Kafka deployment
- Talos Linux
- Kubernetes Custom Resources (Kafka, KafkaTopic, KafkaUser, KafkaNodePool)
- kubectl
- JMX Prometheus Exporter (metrics)
- TLS authentication and Simple Authorization (ACLs)

## Sources Consulted
- Strimzi official documentation: https://strimzi.io/docs/operators/latest/
- Strimzi install instructions: https://strimzi.io/install/
- Strimzi Custom Resource API reference (kafka.strimzi.io/v1beta2)
- Strimzi KRaft mode and KafkaNodePool documentation
- Apache Kafka broker configuration reference
- Kubernetes podAntiAffinity / topologySpread documentation

## Issues Found
No technical issues found.

Detailed checks:
- `kafka.strimzi.io/v1beta2` is the correct stable API version for `Kafka`, `KafkaTopic`, `KafkaUser`, and `KafkaNodePool`.
- The install URL `https://strimzi.io/install/latest?namespace=kafka` matches Strimzi's documented quickstart.
- The operator label selector `name=strimzi-cluster-operator` is the correct label used by Strimzi's deployment.
- KRaft annotations `strimzi.io/kraft: enabled` and `strimzi.io/node-pools: enabled` are correct for enabling KRaft + node pools.
- In the KRaft `Kafka` CR, `spec.kafka.replicas` and `spec.kafka.storage` are correctly omitted — these come from the `KafkaNodePool`.
- `KafkaNodePool.spec.roles: [controller, broker]` is the correct way to configure combined nodes.
- Listener fields (`name`, `port`, `type: internal`, `tls`) are valid.
- `KafkaTopic` uses integer `partitions`/`replicas` at top level and string values under `config`, which matches the CRD schema.
- `KafkaUser` ACL operations (`Read`, `Write`, `Describe`) and `patternType` values (`literal`, `prefix`) match the Strimzi schema.
- `metricsConfig` with `type: jmxPrometheusExporter` and `valueFrom.configMapKeyRef` is the correct shape.
- Bootstrap service name `production-cluster-kafka-bootstrap` follows Strimzi's `<cluster-name>-kafka-bootstrap` convention.
- Pod anti-affinity label `strimzi.io/name: production-cluster-kafka` matches the label Strimzi applies to broker pods.
- The image `quay.io/strimzi/kafka:latest-kafka-3.7.0` follows Strimzi's published image tag scheme.
- `kubectl patch ... --type merge` syntax is valid for the version update example.

## Review Notes
- Kafka 3.7.0 is supported by older Strimzi releases (roughly 0.40–0.42). More recent Strimzi releases (0.46+) support Kafka 3.9.x / 4.0.x and have removed ZooKeeper support entirely. The Step 2 ZooKeeper-based example would not work on the latest Strimzi versions — readers should follow Step 3 (KRaft + KafkaNodePool) on modern installs. The post does note "use KRaft for new deployments," which appropriately signals this.
- The `entityOperator.topicOperator: {}` shorthand works with Strimzi's Unidirectional Topic Operator (the only supported mode from 0.43+); this is fine but worth being aware of when consulting older docs.
- Resource limits omit CPU limits on ZooKeeper and Entity Operator components — intentional and acceptable, but readers should set limits matching their workload.
- The test producer/consumer in Step 7 uses the plaintext listener on port 9092, so no client TLS/SASL configuration is required; this is consistent with the listener definition.
