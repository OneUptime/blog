# Validation Summary: How to Stream Data from Apache Pulsar to ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Pulsar (with KoP — Kafka on Pulsar protocol handler)
- ClickHouse (Kafka engine, MergeTree engine, Materialized Views)
- Python `pulsar-client` library
- Python `clickhouse-driver` library
- Pulsar Admin CLI

## Sources Consulted
- KoP (Kafka on Pulsar) GitHub repository and configuration docs — https://github.com/streamnative/kop
- Apache Pulsar Python client API documentation — https://pulsar.apache.org/api/python/
- ClickHouse Kafka engine documentation — https://clickhouse.com/docs/engines/table-engines/integrations/kafka
- ClickHouse system.kafka_consumers documentation — https://clickhouse.com/docs/operations/system-tables/kafka_consumers
- Apache Pulsar topic naming documentation — https://pulsar.apache.org/docs/concepts-messaging/#topics

## Issues Found

1. **Incomplete KoP configuration (broker.conf)**: The original config only showed `kafkaListeners` and `kafkaAdvertisedListeners`, but omitted the required `messagingProtocols=kafka` and `protocolHandlerDirectory=./protocols` settings. Without these, the Pulsar broker will not load the KoP protocol handler. Also added a note that KoP is a separate download, not bundled with Pulsar.

2. **Python consumer timeout handling bug**: `consumer.receive(timeout_millis=1000)` raises a `pulsar.Timeout` exception when no message is available within the timeout period — it does not return `None`. The original code used `if msg:` to check for a message, which would result in an unhandled exception. Fixed by wrapping the receive call in a `try/except pulsar.Timeout` block.

3. **INSERT column mismatch**: The `INSERT INTO events` statement in the Python consumer listed only 3 columns `(event_time, event_type, user_id)` but the `events` table was defined with 4 columns (including `payload`). Added the missing `payload` column to the INSERT statement.

4. **Topic naming scheme described as "three-part"**: Pulsar topic names have four components: domain (`persistent` or `non-persistent`), tenant, namespace, and topic name. Changed "three-part" to "four-part" and showed both domain options.

## Review Notes
- `system.kafka_consumers` exists in ClickHouse 23.8+ but was disabled by default in some versions (23.8–23.11) due to a memory leak issue. The post does not specify a ClickHouse version, so this is acceptable but readers on older versions may not have access to this table.
- The `msg.data()` method returns `bytes`, not `str`. This works fine with `json.loads()` since Python 3.6, but readers should be aware of the return type.
- KoP version must match the Pulsar broker version (e.g., KoP 2.11.x with Pulsar 2.11.x). The post does not mention version compatibility, which could be a gotcha for readers.
