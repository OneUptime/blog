# Validation Summary: How to Deploy Kafka on Kubernetes with Strimzi

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Apache Kafka
- Kubernetes
- Strimzi Kafka Operator
- KafkaNodePool, Kafka, KafkaTopic, KafkaUser, and KafkaMirrorMaker2 custom resources
- Prometheus Operator PodMonitor
- Helm
- TLS, SCRAM-SHA-512 authentication, and Kafka ACL authorization

## Sources Consulted
- Strimzi Deploying and Managing guide: https://strimzi.io/docs/operators/latest/full/deploying
- Strimzi Custom Resource API Reference: https://strimzi.io/docs/operators/latest/configuring.html
- Strimzi Helm chart README: https://github.com/strimzi/strimzi-kafka-operator/blob/main/helm-charts/helm3/strimzi-kafka-operator/README.md
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Prometheus Operator PodMonitor API documentation: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post used `kafka.strimzi.io/v1beta2` custom resources. Strimzi 1.0.0 and newer support only the `v1` API, so all Strimzi custom resources were updated to `kafka.strimzi.io/v1`.
- The Kafka cluster example used the old ZooKeeper-style Kafka CR with broker replicas, storage, resources, and JVM options directly under `spec.kafka`. Current Strimzi uses KRaft with Kafka node configuration in `KafkaNodePool` resources, so the cluster example was updated to include controller and broker node pools and remove the ZooKeeper section.
- The architecture diagram referred to ZooKeeper and Kafka StatefulSets. Current Strimzi uses KRaft and manages Kafka pods through StrimziPodSet resources, so the diagram was updated accordingly.
- The internal TLS listener did not enable SCRAM authentication, while the application example connected to that listener with `SASL_SSL`. The listener now enables `scram-sha-512`, and the Kafka CR enables simple authorization so KafkaUser ACLs are meaningful.
- The production cluster example exposed an unauthenticated plaintext listener while the checklist required TLS and SASL for all connections. The plaintext listener was removed.
- The Helm example used the older chart repository form. It was updated to the current OCI chart reference shown in the Strimzi Helm chart documentation.
- The application example mounted a PEM CA certificate but did not set the truststore type. `KAFKA_SSL_TRUSTSTORE_TYPE=PEM` was added for Java-client-style configuration.
- The monitoring example used a `ServiceMonitor`, but Strimzi's current Prometheus examples use pod scraping. The snippet was updated to a `PodMonitor` with `podMetricsEndpoints`.
- The KafkaMirrorMaker2 example used deprecated v1beta2 fields (`connectCluster`, `clusters`, `sourceCluster`, and `targetCluster`). It was updated to the v1 `target` and `mirrors[].source` structure, including the required target `groupId` and internal topic fields.
- The Kafka upgrade example used outdated Kafka versions. The examples now use Kafka 4.1.0 and show upgrading to 4.2.0, matching currently documented Strimzi 1.0.0-era Kafka versions.
- The PodDisruptionBudget selector was broadened for older labels. It now targets Kafka broker pods specifically with `strimzi.io/broker-role: "true"`.

## Review Notes
The snippets are syntactically valid YAML. The application environment variable names remain application/image-specific conventions; real deployments should verify that the chosen client image maps those variables to the expected Kafka client properties.
