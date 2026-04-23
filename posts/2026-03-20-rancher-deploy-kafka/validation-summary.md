# Validation Summary: How to Deploy Apache Kafka on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher-managed Kubernetes
- Strimzi Kafka Operator
- Apache Kafka
- Kafka KRaft mode
- Kafka Connect
- Helm
- kubectl

## Sources Consulted
- Strimzi Deploying and Managing Strimzi (latest) — https://strimzi.io/docs/operators/latest/full/deploying
- Strimzi Custom Resource API Reference (latest) — https://strimzi.io/docs/operators/latest/configuring.html
- Strimzi Downloads and supported versions matrix — https://strimzi.io/downloads/

## Issues Found

1. **The post mixed current installation with deprecated Strimzi resource shapes.** The guide installed the operator without pinning an older version, but the examples used `kafka.strimzi.io/v1beta2`, ZooKeeper, and Kafka 3.7.0. Current Strimzi uses `kafka.strimzi.io/v1`, requires KRaft with `KafkaNodePool`, and no longer supports ZooKeeper-based clusters in 0.46+. I updated the install step to Strimzi 0.51.0 and converted the cluster example to KRaft/node pools with Kafka 4.2.0.

2. **Kafka authorization was configured on users but not on the Kafka cluster.** `KafkaUser.spec.authorization.type: simple` only has effect when broker authorization is enabled. I added `spec.kafka.authorization.type: simple` to the Kafka resource.

3. **The application TLS example used the wrong secrets and file formats.** The original snippet pointed Java-style truststore/keystore paths at the `KafkaUser` secret only, which does not provide the broker truststore material needed in that format. I changed the example to mount both the cluster CA secret and the user secret, use the generated `.p12` files and passwords, set PKCS12 store types, and align the bootstrap port with the TLS listener.

4. **The application Deployment snippet was incomplete and cross-namespace secret mounting would fail.** The original Deployment omitted the required selector/template labels and placed the workload in a different namespace from the generated Strimzi secrets. I added the required Deployment fields and moved the example workload into the same namespace as the Kafka-generated secrets so the manifest is runnable as shown.

5. **Kafka Connect used outdated and incorrect `v1` fields.** In the current `v1` CRD, `groupId`, `configStorageTopic`, `offsetStorageTopic`, and `statusStorageTopic` must be set as top-level fields rather than only inside `spec.config`. The secure connection example also lacked client authentication. I corrected the CRD version, added the required top-level fields, switched the TLS certificate reference to the current format, and added a dedicated `KafkaUser` plus TLS client authentication for Kafka Connect.

6. **The monitoring and troubleshooting flow was internally inconsistent with the secured listener setup.** The original broker CLI examples assumed unauthenticated access over port `9092` even though the guide was creating authenticated users and TLS-based clients. I removed the unauthenticated internal listener and changed troubleshooting commands to Kubernetes and Strimzi status checks that work with the secured configuration.

7. **Metrics configuration order was wrong.** The Kafka cluster referenced the `kafka-metrics` ConfigMap before that ConfigMap was created later in the post. I added an inline note to create the ConfigMap from Step 7 before applying the Kafka cluster manifest.

## Review Notes
- The guide is now aligned with Strimzi 0.51.0 and Kafka 4.2.0, so future Strimzi releases may require version updates if the supported Kafka or Kubernetes versions change.
- The Kafka Connect example deploys the Connect cluster itself, but production connectors still need plugins added to the image or mounted separately before real integrations will run.
- The external listener uses `type: loadbalancer`, so Rancher environments without a cloud load balancer need a compatible implementation such as MetalLB.
