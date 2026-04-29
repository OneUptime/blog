# Validation Summary: How to Configure Kafka MirrorMaker 2 for IPv4 Cross-Cluster Replication

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Kafka
- Kafka MirrorMaker 2
- Kafka Connect
- Java `.properties` configuration files
- Kafka CLI tools

## Sources Consulted
- Apache Kafka MirrorMaker configs: https://kafka.apache.org/40/configuration/mirrormaker-configs/
- Apache Kafka geo-replication docs: https://kafka.apache.org/35/operations/geo-replication-cross-cluster-data-mirroring/
- Apache Kafka basic operations / `kafka-consumer-groups.sh`: https://kafka.apache.org/42/operations/basic-kafka-operations/
- Apache Kafka `ReplicationPolicy` Javadoc: https://kafka.apache.org/39/javadoc/org/apache/kafka/connect/mirror/ReplicationPolicy.html
- Apache Kafka `RemoteClusterUtils` Javadoc: https://kafka.apache.org/40/javadoc/org/apache/kafka/connect/mirror/RemoteClusterUtils.html
- Apache Kafka `MirrorClient` Javadoc: https://downloads.apache.org/kafka/4.0.1/javadoc/org/apache/kafka/connect/mirror/MirrorClient.html
- Apache Kafka sample `connect-mirror-maker.properties`: https://raw.githubusercontent.com/apache/kafka/trunk/config/connect-mirror-maker.properties
- Apache Kafka `ReplicationPolicy` source: https://raw.githubusercontent.com/apache/kafka/trunk/connect/mirror-client/src/main/java/org/apache/kafka/connect/mirror/ReplicationPolicy.java
- Apache Kafka `MirrorHeartbeatTask` source: https://raw.githubusercontent.com/apache/kafka/trunk/connect/mirror/src/main/java/org/apache/kafka/connect/mirror/MirrorHeartbeatTask.java
- Java `Properties` file format: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Properties.html

## Issues Found
- The `.properties` example used inline `#` comments on property lines. In Java `Properties` files, comment markers only start comments when they are the first non-whitespace character on the line, so those inline comments would become part of the property values. I moved the comments onto their own lines.
- The post used `source->destination.topics.blacklist`, which is not the current documented MM2 config key. I changed it to `source->destination.topics.exclude` and updated the exclusion patterns so internal topics remain excluded.
- The regex examples in the `.properties` file used single backslashes. In Java `Properties` syntax, a backslash before a non-escape character is dropped during parsing, so literal regex backslashes must be doubled. I corrected the exclusion regexes accordingly.
- The startup example tailed `/var/log/kafka/mirrormaker.log` even though the launch command did not write output there. I redirected stdout and stderr to that file so the log command matches the startup command.
- The monitoring section suggested checking a consumer group named `source-destination`, which is not a documented MM2 monitoring pattern and would not reliably indicate replication health. I replaced that guidance with Connect REST inspection, heartbeat consumption, and the documented MM2 JMX lag metrics.
- The failover example used `kafka-consumer-groups.sh --reset-offsets --to-latest`, which discards translated offsets instead of using MM2's replicated offsets. I changed it to a destination-side `--describe` verification flow and clarified that failover consumers should restart on the destination cluster with the same `group.id`.
- The key takeaways overstated offset behavior as preserved transparently and continuously. I corrected the language to match Kafka's documented behavior: translated offsets are written periodically, and only when the consumer group is inactive on the target cluster.

## Review Notes
- The post is technically relevant and code-based, so it was reviewed as a configuration guide rather than marked `not-code-blog`.
- The topic naming examples are correct for the default `DefaultReplicationPolicy`. They would differ if the deployment used `IdentityReplicationPolicy` or a custom replication policy.
- Kafka docs note that MM2 does not replicate `kafka-console-consumer.sh` consumer groups by default because `groups.exclude` defaults to `console-consumer-.*, connect-.*, __.*`. That caveat is worth keeping in mind when manually testing consumer-group failover behavior.
