# Validation Summary: How to Implement Cross-Datacenter Kafka Replication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apache Kafka
- MirrorMaker 2
- Kafka Connect
- Kafka consumer groups and offsets
- Docker Compose
- Java

## Sources Consulted
- Apache Kafka MirrorMaker configuration reference: https://kafka.apache.org/42/configuration/mirrormaker-configs/
- Apache Kafka geo-replication operations guide: https://kafka.apache.org/41/operations/geo-replication-cross-cluster-data-mirroring/
- Apache Kafka ReplicationPolicy Javadoc/source: https://github.com/apache/kafka/blob/trunk/connect/mirror-client/src/main/java/org/apache/kafka/connect/mirror/ReplicationPolicy.java
- Apache Kafka DefaultReplicationPolicy Javadoc: https://kafka.apache.org/39/javadoc/org/apache/kafka/connect/mirror/DefaultReplicationPolicy.html
- Apache Kafka RemoteClusterUtils Javadoc: https://kafka.apache.org/43/javadoc/org/apache/kafka/connect/mirror/RemoteClusterUtils.html
- Apache Kafka constant values for Checkpoint fields: https://kafka.apache.org/35/javadoc/constant-values.html
- Red Hat Streams for Apache Kafka MirrorMaker 2 guide: https://docs.redhat.com/en/documentation/red_hat_streams_for_apache_kafka/3.0/html/using_streams_for_apache_kafka_on_rhel/assembly-mirrormaker-str

## Issues Found
- The running example showed `kafka-mirror-maker.sh --whitelist` as a standalone alternative under a MirrorMaker 2 section. That command is the legacy MirrorMaker interface, not the recommended MM2 startup path. Replaced it with a valid `connect-mirror-maker.sh ... --clusters` example from the Apache geo-replication guide.
- The custom replication policy overrode `isInternalTopic` with an incomplete MM2 internal-topic test. Updated it to override `isMM2InternalTopic` and match Kafka's MM2 internal-topic behavior more closely for `mm2*.internal` and checkpoint topics.
- The offset translation Java example hand-parsed checkpoint records as string records. MM2 checkpoint records are structured internal records, and Kafka provides `RemoteClusterUtils.translateOffsets` for this purpose. Replaced the example with that API.
- The active-active configuration used `topics.blacklist`, which is not the current MM2 filter property. Changed it to `topics.exclude`, matching Apache Kafka's MirrorMaker source connector config.
- The monitoring example used `kafka-consumer-groups.sh` against a likely nonexistent `mm2-MirrorSourceConnector` group for replication lag. Replaced it with a Connect REST status check and kept replication latency monitoring in the JMX metrics table.
- The heartbeat consumer example used `mm2-heartbeats.dc1.internal`, but the default MM2 heartbeat topic is `heartbeats`. Updated the command accordingly.
- The failover catch-up command repeated the incorrect consumer group check. Replaced it with a Connect REST status check and a note to use MirrorSourceConnector metrics.

## Review Notes
- The Docker Compose snippet remains illustrative. For a runnable production setup, the bootstrap servers and Connect internal-topic replication factors must match the actual cluster topology; a single-broker local environment would need replication factors of `1`.
- The Java snippets omit imports and packaging, which is acceptable for a blog-level example but would need the relevant Kafka client and `connect-mirror-client` dependencies in a real project.
