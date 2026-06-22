# Validation Summary: How to Set Up Kafka with KRaft (No ZooKeeper)

## Status
validated

## Post Type
Technical tutorial / deployment guide

## Technologies Covered
- Apache Kafka
- KRaft metadata mode
- ZooKeeper to KRaft migration
- Kafka CLI tools
- Kafka broker and controller configuration
- TLS configuration
- Kafka JMX metrics
- Python Kafka admin client usage
- Java Kafka AdminClient usage

## Sources Consulted
- Apache Kafka 3.7 KRaft operations documentation: https://kafka.apache.org/37/operations/kraft/
- Apache Kafka 3.7 broker configuration reference: https://kafka.apache.org/37/configuration/broker-configs/
- Apache Kafka 3.7 monitoring documentation: https://kafka.apache.org/37/operations/monitoring/
- Apache Kafka listener configuration documentation: https://kafka.apache.org/40/security/listener-configuration/
- Apache Kafka hardware and OS operations documentation: https://kafka.apache.org/43/operations/hardware-and-os/
- Apache Kafka AdminClient Javadocs: https://kafka.apache.org/33/javadoc/org/apache/kafka/clients/admin/Admin.html
- Apache Kafka QuorumInfo Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/clients/admin/QuorumInfo.html
- Apache Kafka downloads page: https://kafka.apache.org/community/downloads/

## Issues Found
- The download example used `downloads.apache.org` for Kafka 3.7.0, which is an old release and may not remain on the active download mirror. Changed the example to Kafka 3.7.2 from the official Apache archive.
- The post used `kafka-metadata.sh`, which is not the documented tool for KRaft metadata inspection. Replaced those examples with `kafka-metadata-quorum.sh` for quorum status/replication and `kafka-dump-log.sh` for decoding metadata log files.
- The TLS broker example included a `CONTROLLER` listener in `listeners` while describing broker client TLS. For broker-only nodes, the controller listener is not exposed in `listeners`; corrected the snippet to include only client listeners.
- The ZooKeeper to KRaft migration overview said Kafka 3.6 or later and implied a production-ready path. Updated it to Kafka 3.7.2 with `inter.broker.protocol.version=3.7` and noted that Kafka 3.7 documentation treats migration as Early Access and not recommended for production clusters.
- The migration snippets omitted required controller listener settings and `inter.broker.listener.name` for migration controllers. Added the missing settings.
- The broker migration snippet omitted `broker.id` and `inter.broker.protocol.version=3.7` during ZooKeeper-mode migration. Added them to match Kafka's documented migration flow.
- The completion step skipped the required broker reconfiguration from ZooKeeper mode to KRaft mode and the controller finalization step. Added the required `process.roles=broker` / `node.id` broker configuration and controller migration flag removal guidance.
- The JMX metric list included `kafka.controller:type=ControllerStats,name=UncleanLeaderElectionRate`, which is not the documented MBean name. Replaced the list with documented KRaft quorum and broker metadata metrics.
- The Java monitoring example used `Node` without importing `org.apache.kafka.common.Node`. Added the missing import.
- The conclusion described ZooKeeper migration as well-supported. Updated it to recommend careful version-specific testing before production adoption.

## Review Notes
- The article remains version-specific around Kafka 3.7.x. Kafka 4.x removes ZooKeeper support entirely, so future revisions should decide whether the article is a Kafka 3.7 migration guide or a current Kafka 4.x KRaft setup guide.
