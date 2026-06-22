# Validation Summary: How to Deploy Kafka on Kubernetes with Strimzi Operator

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apache Kafka
- Kubernetes
- Strimzi Operator
- Strimzi custom resources: Kafka, KafkaNodePool, KafkaTopic, KafkaUser, KafkaConnect, KafkaRebalance
- KRaft mode
- Prometheus JMX exporter and ServiceMonitor
- Kafka Java producer client
- kafka-python producer and consumer client
- Kafka Connect
- Helm and kubectl

## Sources Consulted
- Strimzi latest operator documentation: https://strimzi.io/docs/operators/latest/deploying
- Strimzi latest configuration and CRD schema reference: https://strimzi.io/docs/operators/latest/configuring.html
- Strimzi downloads and supported versions matrix: https://strimzi.io/downloads/
- Apache Kafka SSL documentation: https://kafka.apache.org/41/security/encryption-and-authentication-using-ssl/
- kafka-python API documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaProducer.html
- Debezium releases and compatibility overview: https://debezium.io/releases/
- Debezium Maven artifact repository: https://repo1.maven.org/maven2/io/debezium/debezium-connector-postgres/
- Confluent Elasticsearch Sink Connector documentation: https://docs.confluent.io/kafka-connectors/elasticsearch/current/overview.html
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Helm command documentation: https://helm.sh/docs/helm/

## Issues Found
- The post used Strimzi `kafka.strimzi.io/v1beta2` examples while the current Strimzi documentation uses `kafka.strimzi.io/v1`. Updated Strimzi custom resources to `v1`.
- The prerequisites listed Kubernetes 1.21 or later, which is outdated for Strimzi 1.0.x. Updated the requirement to Kubernetes 1.30 or later.
- The Kafka examples used Kafka 3.7.0 and `metadataVersion: 3.7-IV4`, which are not current for latest Strimzi. Updated examples to Kafka 4.2.0 with `metadataVersion: 4.2`.
- Removed obsolete `strimzi.io/node-pools` and `strimzi.io/kraft` annotations and the old `inter.broker.protocol.version` setting.
- The production Kafka rack configuration was missing the required rack type for the current schema. Added `type: topology-label`.
- The KafkaUser ACL example required cluster authorization to be enabled. Added `authorization: type: simple` to the production Kafka resource.
- The KafkaRebalance example requires Cruise Control to be deployed. Added `cruiseControl: {}` to the production Kafka resource.
- Java and Python client examples configured SSL while using the plaintext internal listener on port 9092. Updated them to use the TLS listener on port 9093.
- The Java TLS example referenced JKS files and hard-coded passwords that do not match Strimzi's generated PKCS12 user secrets. Updated it to use `ca.p12`, `user.p12`, PKCS12 store types, and environment-provided passwords.
- The KafkaConnect example used `v1beta2`-style internal topic settings in `config`. Moved `groupId`, `configStorageTopic`, `offsetStorageTopic`, and `statusStorageTopic` to the `KafkaConnect` spec fields required by the `v1` API.
- The KafkaConnect example connected to a TLS-authenticated listener without client authentication configuration. Updated it to use the existing plaintext internal listener.
- The Debezium connector artifact was an older 2.5.0.Final build. Updated it to Debezium 3.5.0.Final, which aligns with current Debezium compatibility guidance.
- The Confluent Elasticsearch Sink Connector URL used an old CloudFront host that did not resolve. Updated it to a reachable Confluent Hub download URL for version 14.1.0.
- The scaling and upgrade command blocks were labeled as YAML even though they are shell commands. Updated their code fences to `bash`.
- The troubleshooting examples used a fixed broker pod and PVC name that may not exist with separate controller and broker node pools. Replaced them with placeholders for the actual broker pod name and node ID.

## Review Notes
The revised examples are aligned with Strimzi 1.0.x and current supported Kafka versions as of 2026-06-21. The article still keeps a plaintext internal listener for simple in-cluster examples and Kafka Connect; a future hardening pass could switch Kafka Connect to mTLS by adding a dedicated KafkaUser and Connect authentication configuration.
