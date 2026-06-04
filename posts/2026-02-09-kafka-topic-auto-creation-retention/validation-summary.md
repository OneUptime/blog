# Validation Summary: How to Implement Kafka Topic Auto-Creation and Retention Policies on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Strimzi Kafka Operator
- Kubernetes custom resources and RBAC
- PrometheusRule monitoring
- Kafka Exporter
- Python Kubernetes client

## Sources Consulted
- Apache Kafka broker configuration reference: https://kafka.apache.org/43/configuration/broker-configs/
- Apache Kafka topic configuration reference: https://kafka.apache.org/43/configuration/topic-configs/
- Apache Kafka upgrade notes for KRaft requirements: https://kafka.apache.org/43/getting-started/upgrade/
- Strimzi latest deploying and managing guide: https://strimzi.io/docs/operators/latest/deploying.html
- Strimzi 1.0.0 configuring/API reference: https://strimzi.io/docs/operators/1.0.0/configuring
- Strimzi downloads and supported Kafka versions: https://strimzi.io/downloads/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes Python client project: https://github.com/kubernetes-client/python
- Kafka Exporter README and metrics reference: https://github.com/danielqsj/kafka_exporter

## Issues Found
- The Strimzi examples used `kafka.strimzi.io/v1beta2`, Kafka `3.6.0`, and ZooKeeper-based cluster configuration. Updated the cluster and topic custom resources to `kafka.strimzi.io/v1`, Kafka `4.2.0`, and a KRaft-compatible `KafkaNodePool` plus `Kafka` resource because current Strimzi uses the `v1` API and no longer supports ZooKeeper-based clusters.
- The `kubectl exec` examples referenced the old ZooKeeper-mode broker pod name `production-cluster-kafka-0`. Updated them to the node-pool pod name `production-cluster-dual-role-0` to match the corrected Strimzi KRaft example.
- The topic template script built invalid YAML because command substitution only indented the first generated line under `spec`. It also used a fragile JSONPath expression for ConfigMap keys containing dots and hyphens. Added `TEMPLATE_KEY`, retrieved the ConfigMap entry with bracket JSONPath syntax, and piped the generated spec through `sed` so every line is indented under `spec`.
- The monitoring section described offset-count metrics as storage metrics. Renamed the alert and section wording to offset growth to match the Kafka Exporter metrics actually used.
- The Python lifecycle controller treated custom resources returned by `CustomObjectsApi` as typed objects, but the client returns dictionary-like custom objects. Updated metadata access to dictionary access, switched the Strimzi API version to `v1`, added periodic relisting so age-based deletion can occur without a new watch event, and changed timestamp parsing to timezone-aware `datetime`.
- The lifecycle controller deployment referenced a service account but did not define the ServiceAccount, Role, or RoleBinding required to list, watch, and delete `KafkaTopic` resources. Added minimal namespace-scoped RBAC.

## Review Notes
The Kafka retention and compaction explanations were consistent with the Apache Kafka topic configuration reference. YAML snippets were parsed successfully with Python's YAML parser, and the Python controller snippet was syntax-checked with `ast.parse`. The Prometheus alerts are examples based on offset behavior, not direct disk-byte usage; production storage alerting should also include broker disk and log directory metrics.
