# Validation Summary: How to Configure Kafka MirrorMaker for Cross-Datacenter Replication

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Apache Kafka
- Kafka MirrorMaker 2
- Kafka Connect
- Kafka CLI tools
- Java client utilities
- SASL/SSL configuration
- JMX and Prometheus monitoring
- systemd

## Sources Consulted
- Apache Kafka Geo-Replication documentation: https://kafka.apache.org/41/operations/geo-replication-cross-cluster-data-mirroring/
- Apache Kafka MirrorMaker configuration reference: https://kafka.apache.org/41/configuration/mirrormaker-configs/
- Apache Kafka `RemoteClusterUtils` Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/connect/mirror/RemoteClusterUtils.html
- Apache Kafka `ReplicationPolicy` Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/connect/mirror/ReplicationPolicy.html
- Apache Kafka KIP-382 MirrorMaker 2.0 design: https://cwiki.apache.org/confluence/display/KAFKA/KIP-382%3A+MirrorMaker+2.0

## Issues Found
- The `refresh.topics.interval.seconds` comment incorrectly described the value as milliseconds. Updated it to seconds to match the property name and Apache Kafka configuration reference.
- The custom `ReplicationPolicy` Java example included an `isMirrorTopic` override that is not part of the current Apache Kafka `ReplicationPolicy` API. Removed that method and corrected `upstreamTopic` to return `null` for topics not recognized as remote topics.
- The secure, performance, network, and admin tuning examples used flow-scoped client override keys such as `source->target.producer.*`, but the dedicated MirrorMaker configuration syntax documented by Kafka uses cluster-scoped keys such as `target.producer.*`, `source.consumer.*`, and `{cluster}.admin.*`. Updated the snippets accordingly.
- The Prometheus example implied that the raw JMX port exposes `/metrics`. Clarified that the scrape config applies when a JMX exporter agent is exposing a Prometheus endpoint.
- The CLI command for checking MM2 internal topics only searched for `mm2`, missing default `heartbeats` and checkpoint topic names. Updated the grep pattern.
- The Java `RemoteClusterUtils` example was missing imports for `TopicPartition`, `OffsetAndMetadata`, and `Duration`. Added the imports.
- The Java `RemoteClusterUtils` example used `Properties` where the API expects `Map<String, Object>`. Updated method signatures.
- The Java example called a nonexistent `RemoteClusterUtils.replicationLag` method. Replaced it with the supported `replicationHops` method and adjusted the description/output.
- The failover script used an invalid `kafka-broker-api-versions.sh --timeout` option. Removed the unsupported flag.
- The failover script attempted to inspect the MM2 source consumer group on the target cluster with a generic group name. Updated the example to query the source cluster and use the dedicated MirrorMaker source connector group name format.
- The failover script waited for source-side MM2 lag even when the source cluster was unreachable. Updated the logic to wait only when the source is still reachable and to skip that check after a hard source outage.
- The troubleshooting command assumed a Kafka Connect REST endpoint and connector name for dedicated MirrorMaker mode. Replaced it with a log-based check for `MirrorCheckpointConnector`.

## Review Notes
The guide is technically relevant and broadly aligned with Apache Kafka MirrorMaker 2 documentation after the fixes. The failover script remains an illustrative operational example; production failover should still validate replicated topic end offsets, consumer group state, and application-specific write fencing before traffic is moved.
