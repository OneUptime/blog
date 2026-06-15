# Validation Summary: How to Replicate Topics with MirrorMaker 2 in Kafka

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka
- Kafka MirrorMaker 2
- Kafka Connect
- Kafka consumer client
- Spring Kafka listener examples
- JMX metrics

## Sources Consulted
- Apache Kafka 4.2 Geo-Replication documentation: https://kafka.apache.org/42/operations/geo-replication-cross-cluster-data-mirroring/
- Apache Kafka 4.2 MirrorMaker configuration reference: https://kafka.apache.org/42/configuration/mirrormaker-configs/
- Apache Kafka MirrorHeartbeatTask source: https://github.com/apache/kafka/blob/trunk/connect/mirror/src/main/java/org/apache/kafka/connect/mirror/MirrorHeartbeatTask.java
- Apache Kafka Heartbeat source: https://github.com/apache/kafka/blob/trunk/connect/mirror-client/src/main/java/org/apache/kafka/connect/mirror/Heartbeat.java
- Apache Kafka Checkpoint source: https://github.com/apache/kafka/blob/trunk/connect/mirror-client/src/main/java/org/apache/kafka/connect/mirror/Checkpoint.java
- Apache Kafka DefaultReplicationPolicy source: https://github.com/apache/kafka/blob/trunk/connect/mirror-client/src/main/java/org/apache/kafka/connect/mirror/DefaultReplicationPolicy.java
- Apache Kafka MirrorSourceMetrics source: https://github.com/apache/kafka/blob/trunk/connect/mirror/src/main/java/org/apache/kafka/connect/mirror/MirrorSourceMetrics.java

## Issues Found
- The consumer failover example subscribed to `orders` after failover even though the default MM2 replication policy creates `source.orders` on the target cluster. Updated the explanation and example to subscribe to `source.orders` on the secondary cluster.
- The consumer example omitted required key and value deserializer configuration and had uninitialized final fields. Added a constructor and String deserializer properties.
- The offset translation wording implied seamless failover in all cases. Clarified that translated offsets are available after the checkpoint connector syncs them to the target cluster.
- The heartbeat monitoring example parsed heartbeat values as JSON. Apache Kafka MM2 heartbeat records are binary records with a `Heartbeat.deserializeRecord` helper. Updated the listener to consume byte arrays and deserialize with `Heartbeat`.
- The JMX metric example used a non-authoritative object-name pattern. Reworded it to list the relevant MM2 metric names instead of an inaccurate JMX object name.
- The active-active topic exclusion pattern `.*\..*` would exclude any source topic containing a dot, not only replicated remote topics. Changed the examples to alias-specific remote-topic exclusions.
- The failover verification command checked `mm2-offset-syncs.source.internal`, which stores source-to-target offset mappings and may be on the source cluster by default. Changed it to read the target cluster checkpoint topic `source.checkpoints.internal`.

## Review Notes
The snippets are still illustrative and omit application scaffolding such as imports, logger setup, and `processRecords`. The MM2 configuration keys and connector classes otherwise match the current Apache Kafka documentation.
