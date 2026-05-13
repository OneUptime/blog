# Validation Summary: How to Configure Kafka Topics with Strimzi CRDs via Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Strimzi Kafka Operator
- Strimzi Topic Operator
- KafkaTopic custom resources
- Apache Kafka topic configuration
- Flux CD Kustomization resources
- Kubernetes and kubectl
- Kustomize overlays and patches

## Sources Consulted
- Strimzi Operator documentation, Deploying and Managing 0.45.0: https://strimzi.io/docs/operators/0.45.0/deploying
- Strimzi Operator documentation, KafkaTopic schema reference 0.42.0: https://strimzi.io/docs/operators/0.42.0/configuring.html
- Flux CD Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Apache Kafka documentation for topic CLI usage: https://kafka.apache.org/documentation/

## Issues Found
- The `orders` topic example described `cleanup.policy: delete` as compaction. Updated the comment to correctly say messages are deleted after the retention period.
- The Snappy compression comment claimed a fixed approximate storage reduction. Updated it to avoid an unsupported fixed percentage because compression ratios depend on message content.
- The compacted `audit-log` example described compaction as suitable for audit trails. Updated the comment to clarify that compaction keeps the latest value per key, which is appropriate for state snapshots or changelogs, not complete audit history.
- The best-practice bullet recommended compacted topics for event-sourced state stores. Updated it to keyed state snapshots or changelogs, and kept `delete` for event streams.
- The Flux `prune: true` warning stated that deleting the YAML always deletes the Kafka topic. Updated it to note that Kafka topic deletion must be enabled, matching Strimzi's documented behavior and default.

## Review Notes
The Strimzi `KafkaTopic` API version, cluster label usage, `partitions`, `replicas`, `config` fields, Flux `Kustomization` API, `dependsOn`, `sourceRef`, `path`, and Kafka `kafka-topics.sh --bootstrap-server` commands are technically valid. Reducing partitions is correctly called out as unsupported. Changing topic replication factor after topic creation has additional operational constraints in Strimzi/Kafka, so future revisions could add a note that replica-count changes are not as simple as retention or partition increases.
