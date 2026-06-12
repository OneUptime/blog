# Validation Summary: How to Use Kafka MirrorMaker for Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka MirrorMaker 2.0
- Kafka Connect
- Kafka command-line tools
- Kafka Connect Single Message Transforms
- Java Kafka clients and Connect APIs
- Python kafka-python client
- Prometheus JMX Exporter
- Grafana
- Docker Compose

## Sources Consulted
- Apache Kafka MirrorMaker 2 configuration: https://kafka.apache.org/40/configuration/mirrormaker-configs/
- Apache Kafka KIP-382: MirrorMaker 2.0: https://cwiki.apache.org/confluence/display/KAFKA/KIP-382%3A+MirrorMaker+2.0
- Apache Kafka ReplicationPolicy Javadoc: https://kafka.apache.org/34/javadoc/org/apache/kafka/connect/mirror/ReplicationPolicy.html
- Apache Kafka Connect User Guide: https://kafka.apache.org/40/kafka-connect/user-guide/
- Apache Kafka KIP-618: Exactly-Once Support for Source Connectors: https://cwiki.apache.org/confluence/display/KAFKA/KIP-618%3A%2BExactly-Once%2BSupport%2Bfor%2BSource%2BConnectors
- Kafka Connect InsertHeader SMT reference: https://docs.confluent.io/kafka-connectors/transforms/current/insertheader.html
- Kafka Connect Filter SMT and predicates reference: https://docs.confluent.io/kafka-connectors/transforms/current/filter-ak.html
- Prometheus Alertmanager alerts API documentation: https://prometheus.io/docs/alerting/latest/alerts_api/
- kafka-python API documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaConsumer.html

## Issues Found
- The MirrorMaker 2.0 feature table claimed exactly-once support as a blanket "Yes (with transactions)". Changed it to state that exactly-once is optional and depends on Kafka Connect source exactly-once support and transactions.
- The distributed Kafka Connect run instructions implied connector configuration belongs in `connect-distributed.properties`. Updated the text to clarify that distributed workers are started first and MirrorMaker connectors are created through the Connect REST API.
- The failover script read MM2 checkpoints but then reset consumer groups to earliest offsets. Replaced that unsafe reset with verification of the synced offsets that MM2 writes to `__consumer_offsets` when `sync.group.offsets.enabled=true` and the group is inactive.
- The custom `ReplicationPolicy` example implemented a non-existent `upstreamCluster` method and returned the upstream topic from `topicSource`. Updated it to implement `topicSource` and `upstreamTopic` according to the official interface.
- The custom replication policy described filtering, but filtering belongs in `TopicFilter`, not `ReplicationPolicy`. Removed the misleading filtering method and wording.
- The SMT predicate example described filtering records, but the configured predicate only controlled whether `InsertHeader` ran. Updated the wording and predicate alias to describe applying the header transform only to non-tombstone records.
- The JMX example used `jmx.port`, which is not a Kafka worker property. Replaced it with guidance to expose JMX via `JMX_PORT` or `KAFKA_JMX_OPTS`.
- The Python lag monitor used tuple objects where kafka-python expects `TopicPartition` instances for `assign`, and included unused admin imports. Updated the code to use `TopicPartition` and removed unused imports.
- The Python heartbeat latency example attempted to parse MM2 heartbeat values as JSON. Updated it to use Kafka record timestamps instead.
- The Python Alertmanager example posted a single custom object to the removed `/api/v1/alerts` endpoint. Updated it to post a list of alert objects to `/api/v2/alerts`.
- The custom SMT used `Map<String, ?>.getOrDefault(..., "...")`, which can fail Java compilation because of wildcard capture. Replaced it with explicit `Object` reads and string conversion.
- The quick reference hard-coded `MirrorSourceConnector` as the connector name. Replaced it with `<connector-name>` because names depend on deployment mode and connector creation.

## Review Notes
The post is technically relevant and has been validated after corrections. Several examples remain illustrative and still require environment-specific values, credentials, ACLs, topic names, and operational controls before production use.
