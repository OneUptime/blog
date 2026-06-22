# Validation Summary: Deploying Kafka on Kubernetes with Helm

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apache Kafka
- Kubernetes
- Helm
- Bitnami Kafka Helm chart
- Strimzi Kafka Operator
- Kafka UI
- Confluent Schema Registry
- Kafka Connect
- confluent-kafka Python client
- KafkaJS Node.js client

## Sources Consulted
- Bitnami Kafka Helm chart README and values: https://github.com/bitnami/charts/tree/main/bitnami/kafka
- Bitnami Schema Registry Helm chart values: https://github.com/bitnami/charts/tree/main/bitnami/schema-registry
- Strimzi Custom Resource API Reference: https://strimzi.io/docs/operators/latest/full/configuring
- Strimzi Kafka and Kafka Connect examples: https://github.com/strimzi/strimzi-kafka-operator/tree/main/examples
- Kafka UI Helm chart values: https://github.com/provectus/kafka-ui-charts/blob/main/charts/kafka-ui/values.yaml
- Apache Kafka KRaft operations documentation: https://kafka.apache.org/40/operations/kraft/
- Confluent Schema Registry deployment documentation: https://docs.confluent.io/platform/current/schema-registry/installation/deployment.html

## Issues Found
- Bitnami Kafka values used outdated keys (`kraft.enabled`, `extraConfig`, `auth.clientProtocol`, `auth.interBrokerProtocol`, nested `auth.sasl`, top-level `externalAccess.service`, and `metrics.kafka`). Updated the example to use current chart keys: top-level `clusterId`, `overrideConfiguration`, top-level `sasl`, `externalAccess.broker.service`, `defaultInitContainers.autoDiscovery`, and JMX ServiceMonitor metrics.
- Bitnami Kafka heap settings were nested under `broker`, but the current chart exposes `heapOpts` as a top-level value. Moved `heapOpts` to the top level.
- Strimzi examples used `kafka.strimzi.io/v1beta2` and ZooKeeper-era Kafka cluster layout. Updated Strimzi resources to `kafka.strimzi.io/v1`, added KafkaNodePool resources for controller and broker pools, removed the obsolete ZooKeeper section, and updated the Kafka version/metadata version for the current Strimzi examples.
- KafkaConnect used older internal topic settings inside `spec.config`. Updated to current Strimzi `groupId`, `offsetStorageTopic`, `configStorageTopic`, and `statusStorageTopic` fields.
- Kafka UI values used a `hosts` list shape that does not match the current provectus Helm chart. Updated ingress to `host`, `path`, and `pathType`, and aligned the SASL example credentials with the Kafka SASL user shown earlier.
- Schema Registry values used `kafka.bootstrapServers`, which is not the current Bitnami chart shape. Updated the example to disable the bundled Kafka chart and use `externalKafka.brokers`.
- Node.js KafkaJS example used top-level `await` with CommonJS `require`, which is invalid in a normal CommonJS script. Wrapped the example in an async `main()` function.
- Monitoring and troubleshooting commands used the obsolete/generic `kafka-0` pod name and the wrong metadata tool. Updated commands to use a Strimzi broker pod name and `bin/kafka-metadata-quorum.sh describe --status`.

## Review Notes
The examples are now aligned with current chart schemas and Strimzi v1 custom resources. Real production deployments should still replace placeholder passwords, registry names, domains, storage classes, and sizing values, and should add connector artifact checksums before using Strimzi Kafka Connect builds.
