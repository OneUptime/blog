# Validation Summary: How to Run Redpanda Instead of Kafka on Kubernetes for Lower Latency Streaming

## Status
validated

## Post Type
Tutorial / Kubernetes deployment guide

## Technologies Covered
- Redpanda
- Apache Kafka client compatibility
- Kubernetes
- Redpanda Operator
- Helm
- rpk CLI
- Redpanda Schema Registry
- Prometheus ServiceMonitor
- MirrorMaker 2
- Tiered Storage and Whole Cluster Restore
- Python Kafka clients

## Sources Consulted
- Redpanda Operator production deployment documentation: https://docs.redpanda.com/current/deploy/redpanda/kubernetes/k-production-deployment/
- Redpanda Kubernetes CRD reference (`cluster.redpanda.com/v1alpha2`): https://docs.redpanda.com/current/reference/k-crd/
- Redpanda Kubernetes configuration documentation: https://docs.redpanda.com/current/manage/kubernetes/k-configure-helm-chart/
- Redpanda cluster configuration properties: https://docs.redpanda.com/current/reference/properties/cluster-properties/
- Redpanda internal metrics reference: https://docs.redpanda.com/current/reference/internal-metrics-reference/
- Redpanda rpk cluster partitions reference: https://docs.redpanda.com/current/reference/rpk/rpk-cluster/rpk-cluster-partitions/
- Redpanda rpk cluster storage restore reference: https://docs.redpanda.com/current/reference/rpk/rpk-cluster/rpk-cluster-storage-restore/
- Redpanda Whole Cluster Restore documentation: https://docs.redpanda.com/current/manage/disaster-recovery/whole-cluster-restore/
- Redpanda Schema Registry overview and API documentation: https://docs.redpanda.com/current/manage/schema-reg/schema-reg-overview/
- Redpanda rack awareness CRD reference: https://docs.redpanda.com/current/reference/k-crd/

## Issues Found
- The operator install commands used older GitHub kustomize paths. Replaced them with current Helm-based cert-manager and Redpanda Operator installation commands, including `crds.enabled=true` and rollout verification.
- The Redpanda custom resource used `cluster.redpanda.com/v1alpha1` and fields that do not match the current Operator CRD. Updated snippets to `cluster.redpanda.com/v1alpha2` and moved settings under `spec.clusterSpec`.
- The cluster snippet used outdated or incorrect listener, storage, replica, resource, and cluster configuration fields. Replaced them with current CRD fields such as `statefulset.replicas`, `storage.persistentVolume`, `listeners`, `config.cluster`, and `external.addresses`.
- The local Kafka client examples assumed plaintext listeners while the current chart enables TLS by default. Added `tls.enabled: false` to align the tutorial examples, with a production TLS note.
- The performance tuning snippet used outdated CR shape and invalid or stale property names. Updated it to use `spec.clusterSpec.config.cluster`, `kafka_request_max_bytes`, `kafka_qdc_enable`, and `enable_metrics_reporter`.
- The Schema Registry port-forward referenced a service name that is not the primary Helm service. Changed it to `svc/redpanda` on port `8081`.
- The Confluent Kafka producer example did not flush after producing. Added `producer.flush()`.
- The metrics list used stale latency metric names. Updated produce/fetch latency metrics to `vectorized_kafka_latency_produce_latency_us` and `vectorized_kafka_latency_fetch_latency_us`.
- The p99 latency claim was too absolute. Reworded it to make the performance statement workload-, hardware-, and configuration-dependent.
- The Tiered Storage snippet embedded access keys directly and used the wrong CR shape. Updated it to use `storage.tiered.config` plus `credentialsSecretRef`, and noted that Tiered Storage requires an Enterprise license.
- The scaling command patched the wrong path and used a nonexistent `rpk cluster partitions rebalance` command. Updated the JSON patch path and replaced the command with `rpk cluster partitions balance`.
- The rack awareness snippet used an incomplete old shape. Updated it to `spec.clusterSpec.rackAwareness` and included `rbac.enabled`.
- The backup section used nonexistent `rpk cluster storage backup create/restore` commands. Replaced it with Tiered Storage / Whole Cluster Restore commands using `rpk cluster storage restore start -w` and `rpk cluster storage restore status`.

## Review Notes
The post is now technically aligned with current Redpanda Operator and rpk documentation. The examples are still simplified and omit production concerns such as SASL, TLS, real external DNS names, I/O tuning files, enterprise license secret configuration, and a tested migration cutover plan.
