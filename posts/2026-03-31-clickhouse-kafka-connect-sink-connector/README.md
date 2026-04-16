# How to Use Kafka Connect with ClickHouse Sink Connector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kafka Connect, Kafka, Sink Connector, Data Pipeline, Integration

Description: Configure the official ClickHouse Kafka Connect sink connector to stream data from Kafka topics into ClickHouse tables.

---

The ClickHouse Kafka Connect sink connector is the recommended way to load data from Kafka into ClickHouse when using Kafka Connect. It supports exactly-once semantics, schema evolution, and high-throughput batch inserts.

## Install the Connector

Download the ClickHouse Kafka Connect connector:

```bash
# Using Confluent Hub
confluent-hub install clickhouse/clickhouse-kafka-connect:latest

# Or download the release zip manually from
# https://github.com/ClickHouse/clickhouse-kafka-connect/releases
# then extract it into your Kafka Connect plugin path
unzip clickhouse-kafka-connect-*.zip -d /usr/share/kafka/plugins/
```

## Create the Target Table

```sql
CREATE TABLE events (
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt32,
    session_id String,
    properties String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, event_time);
```

## Configure the Connector

Create a connector configuration file:

```json
{
  "name": "clickhouse-events-sink",
  "config": {
    "connector.class": "com.clickhouse.kafka.connect.ClickHouseSinkConnector",
    "tasks.max": "4",
    "topics": "events",
    "hostname": "clickhouse-host",
    "port": "8443",
    "ssl": "true",
    "username": "default",
    "password": "secret",
    "database": "analytics",
    "key.converter": "org.apache.kafka.connect.storage.StringConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter.schemas.enable": "false",
    "clickhouseSettings": "async_insert=1,wait_for_async_insert=0"
  }
}
```

Deploy via REST API:

```bash
curl -X POST http://kafka-connect:8083/connectors \
  -H "Content-Type: application/json" \
  -d @clickhouse-sink.json
```

## Schema Mapping

The connector maps Kafka message fields to ClickHouse columns by name. Ensure your Kafka message schema matches the ClickHouse table schema:

```json
{
  "event_time": "2025-01-01T00:00:00Z",
  "event_type": "page_view",
  "user_id": 12345,
  "session_id": "abc-123",
  "properties": "{\"page\": \"/home\"}"
}
```

## Enable Exactly-Once Semantics

The connector supports exactly-once delivery by leveraging ClickHouse block deduplication and an internal offset state machine:

```json
{
  "exactlyOnce": "true"
}
```

## Tune Batch Size

Batch size is inherited from the underlying Kafka consumer. Use `consumer.override.max.poll.records` to control how many records are pulled per poll, and the connector's internal buffer settings to coalesce polls into larger inserts (note: buffering is not supported with `exactlyOnce=true`):

```json
{
  "consumer.override.max.poll.records": "50000",
  "bufferCount": "50000",
  "bufferFlushTime": "10000"
}
```

## Monitor the Connector

Check connector status:

```bash
curl http://kafka-connect:8083/connectors/clickhouse-events-sink/status
```

Monitor consumer lag:

```bash
kafka-consumer-groups --bootstrap-server kafka:9092 \
  --group connect-clickhouse-events-sink \
  --describe
```

## Summary

The ClickHouse Kafka Connect sink connector provides a production-ready, managed approach to loading Kafka data into ClickHouse. Configure tasks, batch size, and flush timeout to balance latency and throughput. Enable exactly-once semantics when data correctness is critical and your Kafka cluster supports transactions.
