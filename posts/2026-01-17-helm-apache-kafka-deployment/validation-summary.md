# Validation Summary: How to Deploy Apache Kafka with Helm on Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apache Kafka
- Kubernetes
- Helm
- Strimzi Kafka Operator
- Bitnami Kafka Helm chart
- ZooKeeper
- KRaft
- Kafka Connect
- Prometheus Operator monitoring
- JMX Prometheus Exporter

## Sources Consulted
- Strimzi Operator 0.38.0 documentation: https://strimzi.io/docs/operators/0.38.0/
- Strimzi Operator 0.39.0 configuration reference: https://strimzi.io/docs/operators/0.39.0/configuring
- Strimzi latest deployment documentation: https://strimzi.io/docs/operators/latest/deploying
- Strimzi GitHub releases for v1 API and ZooKeeper support status: https://github.com/strimzi/strimzi-kafka-operator/releases
- Strimzi official PodMonitor example: https://github.com/strimzi/strimzi-kafka-operator/blob/0.38.0/examples/metrics/prometheus-install/strimzi-pod-monitor.yaml
- Bitnami Kafka Helm chart README: https://github.com/bitnami/charts/blob/main/bitnami/kafka/README.md
- Bitnami Kafka Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/kafka/values.yaml
- Strimzi certificate and secret reference: https://github.com/strimzi/strimzi-kafka-operator/blob/main/documentation/modules/security/ref-certificates-and-secrets.adoc
- Apache Kafka 3.6.0 release notes: https://archive.apache.org/dist/kafka/3.6.0/RELEASE_NOTES.html

## Issues Found
- The Strimzi Helm install was unpinned even though the examples use Kafka 3.6.0, ZooKeeper, and `kafka.strimzi.io/v1beta2`. I pinned the chart to Strimzi 0.38.0 and added a caveat that newer Strimzi releases use KRaft and Strimzi 1.0+ uses the `v1` CRD API.
- The Strimzi Kafka cluster did not enable broker authorization, so the `KafkaUser` ACL examples would not be enforced. I added `spec.kafka.authorization.type: simple`.
- The internal TLS listener did not enable TLS client authentication, so the TLS `KafkaUser` examples would not authenticate clients on the documented bootstrap port. I added `authentication.type: tls` to the internal TLS listener.
- The Kafka Exporter metric `kafka_consumergroup_lag` was referenced without deploying Kafka Exporter. I added `kafkaExporter` configuration to the Strimzi Kafka resource.
- The JMX metrics rules did not expose the `_total` counter metrics used by the PromQL examples for message and byte rates. I added rules for `MessagesInPerSec`, `BytesInPerSec`, and `BytesOutPerSec` counters.
- The Bitnami Kafka values used an older ZooKeeper-era chart schema. I updated the example to the current KRaft-oriented `controller`, `broker`, `listeners`, `sasl`, `externalAccess`, `defaultInitContainers.autoDiscovery`, and `rbac` values.
- The Bitnami snippet used a full `config` replacement for a few Kafka settings. I changed this to `overrideConfiguration` so the chart can still generate required broker/controller configuration.
- The client deployment examples mounted only the KafkaUser secret and treated `ca.crt` as a Java truststore. I updated the producer and consumer examples to run in the `kafka` namespace and mount both the KafkaUser secret and the Strimzi cluster CA secret, using PKCS#12 truststore and keystore settings.
- The Kafka Connect example used a TLS-authenticated listener but did not provide client credentials. I added TLS `authentication.certificateAndKey` and a matching `my-connect` KafkaUser with ACLs for Connect internal topics and CDC topics.
- The monitoring example used a `ServiceMonitor`, while Strimzi's official example scrapes Kafka-family metrics with `PodMonitor` on the `tcp-prometheus` pod port. I changed the example to a `PodMonitor`.

## Review Notes
The Strimzi path in this post is now explicitly a Kafka 3.6 / Strimzi 0.38 ZooKeeper-based deployment. For a future refresh, consider rewriting that path for current Strimzi KRaft deployments and the `kafka.strimzi.io/v1` API instead of maintaining the legacy ZooKeeper architecture.
