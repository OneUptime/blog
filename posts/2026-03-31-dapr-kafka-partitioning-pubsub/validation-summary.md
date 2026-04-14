# Validation Summary: How to Handle Kafka Partitioning with Dapr Pub/Sub

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Kafka (partitioning, consumer groups, topic management)
- Dapr Pub/Sub (Kafka component)
- Dapr HTTP API (publish endpoint)
- Dapr Go SDK (PublishEvent with metadata)
- Kafka CLI tools (kafka-topics.sh, kafka-consumer-groups.sh)

## Sources Consulted
- Dapr Pub/Sub API Reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Kafka Pub/Sub Component Reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Go SDK documentation: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Apache Kafka documentation (partitioner, consumer groups, CLI tools): https://kafka.apache.org/documentation/
- Kafka KIP-345 (static group membership): https://cwiki.apache.org/confluence/display/KAFKA/KIP-345
- Kafka BuiltInPartitioner source (murmur2 hash confirmation)

## Issues Found

1. **HTTP API metadata passed as headers instead of query parameters**: The first curl example used `-H "metadata.partitionKey: customer-123"` to pass the partition key as an HTTP header. The Dapr publish API accepts metadata as query parameters, not headers. Fixed to use `?metadata.partitionKey=customer-123` in the URL.

2. **Invalid request body metadata wrapper format**: The second curl example used a `{"data": {...}, "metadata": {...}}` body wrapper to pass metadata. The standard Dapr publish endpoint (`POST /v1.0/publish/{pubsubname}/{topic}`) takes raw event data as the body and accepts metadata only via query parameters. Removed the second example entirely since the corrected first example already demonstrates the correct approach.

3. **Missing `encoding/json` import in Go SDK example**: The Go code used `json.Marshal()` but did not include `"encoding/json"` in the import block. Added the missing import.

4. **"Cooperative rebalancing" mislabeled as static group membership**: The rebalancing section stated "Use cooperative rebalancing to minimize downtime" and then showed `groupInstanceID` configuration. The `group.instance.id` Kafka setting enables **static group membership** (KIP-345), which is a different feature from cooperative rebalancing (which is controlled by `partition.assignment.strategy`). Fixed the text to say "static group membership."

## Review Notes
- The `groupInstanceID` metadata field is not documented in the official Dapr Kafka pub/sub component metadata specification. While it may work if the underlying Kafka client passes it through, users should verify this works with their Dapr version. The concept is correctly explained even if the field may not be officially supported.
- The post states that without partition keys, Kafka distributes messages "round-robin across partitions." This was accurate for Kafka < 2.4 but since Kafka 2.4+ (KIP-480), the default behavior for null-key messages uses sticky partitioning (batching to a single partition before switching). This is a minor accuracy point that doesn't affect the Dapr-specific guidance.
- The Kafka murmur2 hash claim is correct — verified against Kafka's `BuiltInPartitioner.java` source.
- The `kafka-topics.sh` and `kafka-consumer-groups.sh` commands and flags are correct per official Kafka documentation.
- The Dapr component YAML fields (`brokers`, `consumerGroup`, `authType`, `initialOffset`) are all valid for the `pubsub.kafka` component type.
