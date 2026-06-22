# Validation Summary: How to Back Up and Restore Kafka Topics

## Status
validated

## Post Type
Tutorial / operations guide

## Technologies Covered
- Apache Kafka
- Kafka MirrorMaker 2
- Kafka Connect
- Confluent Kafka Python client
- Kafka Java producer and admin clients
- Confluent Amazon S3 Sink Connector
- Amazon S3

## Sources Consulted
- Apache Kafka MirrorMaker 2 geo-replication documentation: https://kafka.apache.org/41/operations/geo-replication-cross-cluster-data-mirroring/
- Confluent Kafka Python client API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Confluent Amazon S3 Sink Connector configuration reference: https://docs.confluent.io/kafka-connectors/s3-sink/current/configuration_options.html
- Confluent Amazon S3 Sink Connector overview and partitioning documentation: https://docs.confluent.io/kafka-connectors/s3-sink/current/overview.html
- Apache Kafka ProducerRecord Javadoc: https://kafka.apache.org/25/javadoc/org/apache/kafka/clients/producer/ProducerRecord.html
- Apache Kafka client Javadocs: https://javadoc.io/doc/org.apache.kafka/kafka-clients/latest/

## Issues Found
1. **MirrorMaker 2 startup wording was misleading.** The post described `connect-mirror-maker.sh` as starting MM2 "as a distributed connector" and implied `connect-distributed.sh` alone was an equivalent MM2 startup command. Apache Kafka documents `connect-mirror-maker.sh` as the dedicated MirrorMaker mode, while a shared Connect cluster requires connector creation through the Connect REST API. Updated the wording to distinguish those paths.

2. **Consumer backup decoded Kafka keys and values as UTF-8 strings.** Kafka records are byte payloads, and arbitrary topic data may not be UTF-8. This also made null-valued tombstone records indistinguishable from skipped records during restore. Updated the backup format to store keys and values as Base64 and preserve null values.

3. **Header backup was not JSON-safe.** `dict(msg.headers())` can contain byte values, which are not JSON serializable. Updated header serialization to store header values as Base64.

4. **The S3 backup method returned a single object URI even though it uploaded multiple batch objects.** Updated the method to return the exact list of uploaded S3 object URIs.

5. **Restore examples skipped null values and used string serializers.** Kafka compacted topics may contain tombstones with null values, and a general backup/restore tool should preserve bytes. Updated the Java restore example to use `ByteArraySerializer` and Base64 decoding, and updated the Python restore example to decode Base64 bytes and preserve null values.

6. **Consumer offset backup used incorrect Confluent Python APIs.** The original snippet read a private `_conf` attribute, called `consumer.committed([])` without partitions, and treated the result like a dictionary. Replaced it with the documented `AdminClient.list_consumer_group_offsets()` and `AdminClient.alter_consumer_group_offsets()` APIs using `ConsumerGroupTopicPartitions`.

7. **The restore verification snippet was missing required imports.** Added `Consumer`, `gzip`, and `json` imports so the snippet is syntactically complete.

8. **The conclusion overstated MirrorMaker 2 RPO.** Changed "near-zero RPO" to "near-real-time RPO" to better reflect replication lag and failover realities.

## Review Notes
The consumer-based backup examples are still illustrative and bounded by `max_messages` or poll timeout behavior; production backup tools should usually capture partition end offsets before consuming and stop per partition at those offsets for a consistent point-in-time snapshot. The S3 Sink configuration is valid for Confluent Platform, but JSON converter settings assume JSON-compatible record values.
