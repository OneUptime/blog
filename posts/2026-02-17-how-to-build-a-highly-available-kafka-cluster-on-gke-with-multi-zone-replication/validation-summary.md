# Validation Summary: How to Build a Highly Available Kafka Cluster on GKE with Multi-Zone Replication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Kubernetes Engine
- Google Cloud CLI
- Apache Kafka
- Strimzi Operator
- Kubernetes custom resources, scheduling, taints, tolerations, and topology spread
- Confluent Kafka Python producer client
- Prometheus JMX exporter
- Google Cloud Monitoring alerting policies

## Sources Consulted
- Strimzi Operator deployment documentation: https://strimzi.io/docs/operators/latest/deploying
- Strimzi Custom Resource API reference: https://strimzi.io/docs/operators/in-development/full/configuring.html
- Google Cloud SDK `gcloud container clusters create` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud SDK `gcloud container node-pools create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain
- Confluent Kafka producer configuration reference: https://docs.confluent.io/platform/current/installation/configuration/producer-configs.html
- librdkafka configuration reference: https://docs.confluent.io/platform/current/clients/librdkafka/html/md_CONFIGURATION.html

## Issues Found
- The Strimzi example installed the current Helm chart but used the older ZooKeeper-style `kafka.strimzi.io/v1beta2` Kafka resource with `spec.zookeeper`. Updated the manifest to current `kafka.strimzi.io/v1` KRaft resources with separate `KafkaNodePool` resources for controllers and brokers.
- The Kafka version was pinned to `3.6.0`, which did not match the current Strimzi/KRaft example style. Updated the example to Kafka `4.2.0` with `metadataVersion: 4.2-IV1`.
- The broker node pool command added a local SSD, but the Strimzi storage configuration used `premium-rwo` persistent volumes rather than local SSD storage. Removed the unused `--local-ssd-count` flag and adjusted the wording to SSD-backed persistent disks.
- The rack-awareness explanation implied replication across all zones from rack awareness alone. Clarified that rack awareness works with broker topology spread constraints and applies to new partition assignment.
- The failure-mode explanation said writes continue with only `min.insync.replicas: 2`. Clarified that this durability behavior also depends on producers using `acks=all`.
- The `KafkaTopic` resource used the older `v1beta2` API version. Updated it to `kafka.strimzi.io/v1`.
- The Cloud Monitoring alert command omitted required condition fields for a metric-threshold policy. Added `--condition-filter`, `--if`, and `--duration`.
- The disaster recovery test used only `kubectl cordon`, which prevents new scheduling but does not evict existing pods. Updated the test to cordon and drain nodes in the target zone.
- The verification command exec'd into a specific broker that could be unavailable during a zone failure. Replaced it with a temporary Strimzi Kafka tools pod that connects through the bootstrap service.

## Review Notes
- The updated Strimzi manifest is intentionally aligned with current KRaft-based Strimzi usage. Operators running older Strimzi releases would need to adjust versions and resource schemas accordingly.
- The Google Cloud Monitoring metric type assumes Prometheus metrics are ingested into Cloud Monitoring using the managed Prometheus metric naming convention.
