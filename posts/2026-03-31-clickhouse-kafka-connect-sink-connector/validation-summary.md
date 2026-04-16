# Validation Summary: How to Use Kafka Connect with ClickHouse Sink Connector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, async inserts)
- Apache Kafka / Kafka Connect
- ClickHouse Kafka Connect Sink Connector (`com.clickhouse.kafka.connect.ClickHouseSinkConnector`)
- Confluent Hub CLI
- Kafka Connect REST API
- `kafka-consumer-groups` CLI

## Sources Consulted
- [ClickHouse Kafka Connect Sink docs](https://clickhouse.com/docs/integrations/kafka/clickhouse-kafka-connect-sink)
- [ClickHouse/clickhouse-kafka-connect GitHub repo](https://github.com/ClickHouse/clickhouse-kafka-connect)
- [clickhouse-kafka-connect DESIGN.md](https://github.com/ClickHouse/clickhouse-kafka-connect/blob/main/docs/DESIGN.md)
- [ClickHouse blog: Announcing a New Official ClickHouse Kafka Connector](https://clickhouse.com/blog/kafka-connect-connector-clickhouse-with-exactly-once)
- [ClickHouse/clickhouse-kafka-connect releases](https://github.com/ClickHouse/clickhouse-kafka-connect/releases)
- GitHub discussion #255 on batching behaviour and consumer property overrides

## Issues Found

1. **Wrong exactly-once property names.** The original post used `exactly.once.support: "required"` and `transaction.boundary: "poll"`. These are Kafka Connect framework properties for **source** connectors (KIP-618), not sink connectors. The ClickHouse sink connector uses its own boolean property `exactlyOnce` (camelCase). Replaced with `"exactlyOnce": "true"` and updated the surrounding sentence to describe how the connector achieves exactly-once (ClickHouse block deduplication + internal offset state machine) rather than the incorrect "Kafka transactions" rationale.

2. **Invalid batch-tuning properties.** The post recommended `batch.size` and `flush.timeout.ms`, neither of which are ClickHouse Kafka Connect sink properties. Batch size is inherited from the Kafka consumer (`consumer.override.max.poll.records`), and record coalescing is controlled by the connector's `bufferCount` / `bufferFlushTime` properties. Replaced the example with these valid properties and added a note that buffering is incompatible with `exactlyOnce=true`.

3. **Redundant/invalid `schemas.enable`.** The connector config block contained both a top-level `"schemas.enable": "false"` (not a valid Kafka Connect connector-level property) and the correct per-converter `"value.converter.schemas.enable": "false"`. Removed the invalid top-level key.

4. **Broken manual download URL.** The `curl` command pointed at `https://github.com/ClickHouse/clickhouse-kafka-connect/releases/latest/download/clickhouse-kafka-connect.jar`. No such asset name exists — the release artifact is a versioned zip archive, and `/releases/latest/download/<filename>` requires an exact asset name, so the command would 404. Replaced with a comment directing the reader to the releases page and an `unzip` command that works with the versioned zip artifact.

## Review Notes
- The SQL `CREATE TABLE` example, JSON message shape, Kafka Connect REST API usage, and `kafka-consumer-groups --describe` command for the `connect-<connector-name>` group are all accurate.
- The `async_insert=1,wait_for_async_insert=0` settings in `clickhouseSettings` are valid, but combining `wait_for_async_insert=0` with strict exactly-once guarantees is a subtle foot-gun — that caveat is out of scope for this post but worth flagging if the post is ever expanded.
- The `confluent-hub install clickhouse/clickhouse-kafka-connect:latest` invocation is plausible and matches the documented Confluent Hub coordinates.
- The `port: 8443` + `ssl: true` combo is the documented ClickHouse Cloud / HTTPS default; the insecure HTTP default (8123) is not mentioned but didn't need to be for this example.
