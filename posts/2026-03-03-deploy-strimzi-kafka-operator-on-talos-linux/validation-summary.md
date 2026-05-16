# Validation Summary: How to Deploy Strimzi Kafka Operator on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Strimzi Kafka Operator (0.40.0)
- Apache Kafka (3.7.0)
- Kubernetes (CRDs, kubectl, Helm)
- Talos Linux (machine config, disk configuration)
- ZooKeeper (Strimzi-managed ensemble)
- SCRAM-SHA-512 authentication and simple authorization (Kafka ACLs)
- JMX Prometheus Exporter for metrics

## Sources Consulted
- Strimzi official documentation: https://strimzi.io/documentation/
- Strimzi Helm chart documentation: https://strimzi.io/docs/operators/latest/deploying#deploying-cluster-operator-helm-chart-str
- Strimzi Kafka custom resource API reference: https://strimzi.io/docs/operators/latest/configuring.html
- Strimzi container images on quay.io: https://quay.io/repository/strimzi/kafka
- Apache Kafka documentation: https://kafka.apache.org/37/documentation.html
- Talos Linux machine configuration reference: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Kubernetes Helm v3 documentation: https://helm.sh/docs/

## Issues Found
No technical issues found.

All technical details were verified against official sources:
- Helm repository URL (`https://strimzi.io/charts/`), chart name (`strimzi/strimzi-kafka-operator`), and the `watchAnyNamespace=true` value are correct.
- The Kafka CR uses the correct `kafka.strimzi.io/v1beta2` API version, with valid `listeners`, `config`, `storage`, `resources`, `zookeeper`, and `entityOperator` sub-fields.
- The Strimzi 0.40.0 release supports Kafka 3.7.0, and the container image `quay.io/strimzi/kafka:0.40.0-kafka-3.7.0` is a published tag.
- KafkaTopic and KafkaUser specs use correct field names (`partitions`, `replicas`, `config`, `authentication.type`, `authorization.type`, `acls`, `patternType`). The ACL `operations` (`Write`, `Read`, `Describe`) use the correct capitalization Strimzi expects.
- The SCRAM-SHA-512 secret's `password` field name and base64 decoding command are correct.
- The Talos `machine.disks` snippet with `device` and `partitions.mountpoint` is a valid configuration.
- The `metricsConfig` block with `jmxPrometheusExporter` and `configMapKeyRef` matches the Strimzi schema.
- The CRD list (`kafkas`, `kafkatopics`, `kafkausers`, `kafkaconnects`) matches the resources installed by the operator.

## Review Notes
- Versioning caveat: Strimzi 0.40.0 (released April 2024) and Kafka 3.7.0 are now older releases. Strimzi has since deprecated ZooKeeper-based clusters in favor of KRaft mode (default since Strimzi 0.46). The tutorial's ZooKeeper-based example still works but readers running the latest Strimzi may want to migrate to a `KafkaNodePool` + KRaft setup.
- The Talos disk snippet omits `size`, which Talos accepts (the partition will use remaining space). Users should also ensure the corresponding mountpoint is wired into a CSI driver / PV before Kafka can consume it.
- The post does not mention that `helm repo update` should be run after `helm repo add` if the cache is stale; the included flow already does this, which is good.
- The producer/consumer test commands use `--broker-list` and `--bootstrap-server` respectively. `--broker-list` is deprecated in modern Kafka in favor of `--bootstrap-server`, but it still works in Kafka 3.7.0, so this is not incorrect — just a stylistic legacy.
