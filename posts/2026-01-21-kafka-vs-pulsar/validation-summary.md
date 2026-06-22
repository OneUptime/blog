# Validation Summary: Kafka vs Pulsar: Streaming Platform Comparison

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Apache Kafka
- Apache Pulsar
- Apache BookKeeper
- Kafka Java client
- Pulsar Java client
- Kafka ACLs
- MirrorMaker 2
- Pulsar geo-replication
- Tiered storage / remote log storage
- Pulsar Kafka compatibility wrapper

## Sources Consulted
- Apache Kafka tiered storage documentation: https://kafka.apache.org/40/operations/tiered-storage/
- Apache Kafka authorization and ACLs documentation: https://kafka.apache.org/43/security/authorization-and-acls/
- Apache Kafka consumer configuration documentation: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka / Confluent consumer group design documentation: https://docs.confluent.io/kafka/design/consumer-design.html
- Apache Pulsar architecture overview: https://pulsar.apache.org/docs/4.0.x/concepts-architecture-overview/
- Apache Pulsar metadata store documentation: https://pulsar.apache.org/docs/next/administration-metadata-store/
- Apache Pulsar multi-tenancy documentation: https://pulsar.apache.org/docs/next/concepts-multi-tenancy/
- Apache Pulsar messaging and subscription documentation: https://pulsar.apache.org/docs/next/concepts-messaging/
- Apache Pulsar schema documentation: https://pulsar.apache.org/docs/next/schema-overview/
- Apache Pulsar retention and expiry documentation: https://pulsar.apache.org/docs/next/cookbooks-retention-expiry/
- Apache Pulsar geo-replication documentation: https://pulsar.apache.org/docs/next/administration-geo/
- Apache Pulsar AWS S3 offloader documentation: https://pulsar.apache.org/docs/next/tiered-storage-aws/
- Apache Pulsar Kafka adaptor documentation: https://pulsar.apache.org/docs/next/adaptors-kafka/

## Issues Found
- Kafka architecture diagram said coordination was "ZooKeeper or KRaft." Updated it to KRaft with a note that ZooKeeper applies to Kafka 3.x and earlier, because Kafka 4.x removed ZooKeeper mode.
- Pulsar architecture diagram hard-coded ZooKeeper as metadata coordination. Updated it to "Metadata Store" with ZooKeeper, etcd, or other supported backend, matching current Pulsar architecture.
- Feature table described Pulsar TTL as per-message. Updated it to namespace/topic TTL because Pulsar TTL is configured as namespace or topic policy, not as a per-message producer setting.
- Feature table described Kafka tiered storage as "Confluent only." Updated it to remote log storage with a required plugin/vendor implementation because Apache Kafka has remote log storage support, while the storage manager implementation is not bundled out of the box.
- Kafka Java consumer example omitted required key and value deserializer configuration. Added `StringDeserializer` configs so the snippet can instantiate a working `KafkaConsumer<String, String>`.
- Pulsar tiered storage example used `managedLedgerOffloadThresholdInBytes` in broker config. Replaced it with the documented namespace-level `pulsar-admin namespaces set-offload-threshold` command and added the required `offloadersDirectory` setting.
- "When to Choose Pulsar" referred to tiered storage without an enterprise license and message-level TTL. Reworded those bullets to bundled tiered storage offloaders and namespace/topic TTL policies.

## Review Notes
- The latency and throughput numbers are approximate benchmark-style guidance rather than guaranteed platform characteristics. Actual results depend heavily on message size, batching, partition/topic count, acknowledgments, replication, storage, network, and client configuration.
- The Pulsar Kafka wrapper is still documented, but the official docs note that its Maven artifacts are from the separate `apache/pulsar-adapters` repository and the latest published wrapper version remains `2.11.0`.
