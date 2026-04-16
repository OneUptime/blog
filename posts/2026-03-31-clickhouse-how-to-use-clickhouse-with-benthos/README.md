# How to Use ClickHouse with Benthos

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Benthos, Stream Processing, ETL, Data Pipeline, Integration

Description: Use Benthos (Redpanda Connect) to build stream processing pipelines that ingest, transform, and load data into ClickHouse with YAML-based configuration.

---

Benthos (now known as Redpanda Connect) is a high-performance stream processing tool configured entirely in YAML. Its built-in `sql_insert` output with the ClickHouse driver makes it simple to build pipelines from Kafka, HTTP, files, or databases directly into ClickHouse.

## Installing Benthos

```bash
# Using the official installer
curl -Lsf https://sh.benthos.dev | bash

# Or via Docker (Redpanda Connect image)
docker pull docker.redpanda.com/redpandadata/connect
```

## Basic Pipeline: HTTP to ClickHouse

Create `pipeline.yaml`:

```text
input:
  http_server:
    address: 0.0.0.0:4195
    path: /events
    allowed_verbs: [POST]

pipeline:
  processors:
    - bloblang: |
        root = this
        root.processed_at = now()

output:
  sql_insert:
    driver: clickhouse
    dsn: "clickhouse://default:@localhost:9000/default"
    table: events
    columns:
      - event_id
      - user_id
      - event_type
      - created_at
      - processed_at
    args_mapping: |
      root = [
        this.event_id,
        this.user_id,
        this.event_type,
        this.created_at,
        this.processed_at
      ]
    init_statement: |
      CREATE TABLE IF NOT EXISTS default.events (
        event_id String,
        user_id String,
        event_type String,
        created_at DateTime,
        processed_at DateTime
      ) ENGINE = MergeTree()
      ORDER BY (created_at, event_id)
    batching:
      count: 1000
      period: 5s
```

Run it:

```bash
benthos -c pipeline.yaml
```

## Kafka to ClickHouse

Read from Kafka and write to ClickHouse:

```text
input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - user-events
    consumer_group: clickhouse-loader

pipeline:
  processors:
    - bloblang: |
        root = this.parse_json()
        root.ingested_at = now()

output:
  sql_insert:
    driver: clickhouse
    dsn: "clickhouse://default:@localhost:9000/default"
    table: user_events
    columns:
      - event_id
      - user_id
      - event_type
      - ingested_at
    args_mapping: |
      root = [
        this.event_id,
        this.user_id,
        this.event_type,
        this.ingested_at
      ]
    batching:
      count: 500
      period: 3s
```

## Transformations with Bloblang

Benthos's Bloblang language handles complex transformations inline:

```text
pipeline:
  processors:
    - bloblang: |
        root.user_id = this.userId.string()
        root.event_type = this.type.lowercase()
        root.amount = this.amount.number()
        root.ts = this.timestamp.ts_parse("2006-01-02T15:04:05Z07:00")
        root.date = root.ts.ts_format("2006-01-02")
```

## Fanout to Multiple Outputs

Send data to both ClickHouse and a log sink simultaneously:

```text
output:
  broker:
    pattern: fan_out
    outputs:
      - sql_insert:
          driver: clickhouse
          dsn: "clickhouse://default:@localhost:9000/default"
          table: events
          columns: [event_id, user_id, event_type, created_at]
          args_mapping: |
            root = [this.event_id, this.user_id, this.event_type, this.created_at]
      - stdout:
          codec: lines
```

## Summary

Benthos provides a declarative, YAML-based approach to building data pipelines into ClickHouse. Its `sql_insert` output with the ClickHouse driver handles batching, retries, and schema initialization. Combined with Bloblang for transformations and support for dozens of input sources, Benthos is an efficient way to stream data into ClickHouse.
