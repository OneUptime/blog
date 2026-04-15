# How to Build a Redpanda to ClickHouse Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Redpanda, Pipeline, Streaming, Kafka

Description: Build a Redpanda to ClickHouse data pipeline using ClickHouse's Kafka engine, since Redpanda is fully Kafka API-compatible and requires no special configuration.

---

Redpanda is a Kafka-compatible streaming platform that offers lower latency and simpler operations than Apache Kafka. Because Redpanda implements the full Kafka API, ClickHouse's built-in Kafka engine works with Redpanda without modification - just point it at your Redpanda brokers.

## Why Redpanda

Redpanda eliminates ZooKeeper, runs as a single binary, and delivers lower tail latencies compared to Kafka. For ClickHouse pipelines, this means simpler infrastructure and faster end-to-end latency from event production to analytical availability.

## Setting Up the ClickHouse Kafka Engine with Redpanda

```sql
CREATE TABLE redpanda_events_raw (
    event_time String,
    user_id String,
    event_type String,
    properties String
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'redpanda-1:9092,redpanda-2:9092,redpanda-3:9092',
    kafka_topic_list = 'events',
    kafka_group_name = 'clickhouse-consumers',
    kafka_format = 'JSONEachRow',
    kafka_max_block_size = 65536,
    kafka_num_consumers = 4,
    kafka_handle_error_mode = 'stream';
```

The configuration is identical to a Kafka setup - just replace the broker addresses with your Redpanda broker addresses. The `kafka_handle_error_mode = 'stream'` setting makes the `_error` virtual column available, which we use later to filter out malformed messages.

## TLS Authentication with Redpanda

If your Redpanda cluster uses TLS and SASL:

```sql
CREATE TABLE redpanda_events_raw (
    event_time String,
    user_id String,
    event_type String
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'redpanda-1:9093,redpanda-2:9093',
    kafka_topic_list = 'events',
    kafka_group_name = 'clickhouse-consumers',
    kafka_format = 'JSONEachRow',
    kafka_security_protocol = 'SASL_SSL',
    kafka_sasl_mechanism = 'SCRAM-SHA-256',
    kafka_sasl_username = 'clickhouse-user',
    kafka_sasl_password = 'SecurePass!2026';
```

SSL certificate paths like `ssl.ca.location` are librdkafka properties that must be configured in the ClickHouse server XML config file rather than in the CREATE TABLE statement:

```xml
<!-- /etc/clickhouse-server/config.d/kafka.xml -->
<clickhouse>
    <kafka>
        <ssl_ca_location>/etc/clickhouse-server/ssl/redpanda-ca.crt</ssl_ca_location>
    </kafka>
</clickhouse>
```

## Target Table and Materialized View

```sql
CREATE TABLE events (
    event_time DateTime,
    user_id UInt64,
    event_type LowCardinality(String),
    properties String
) ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user_id);

CREATE MATERIALIZED VIEW events_mv TO events AS
SELECT
    toDateTime(event_time) AS event_time,
    toUInt64(user_id) AS user_id,
    event_type,
    properties
FROM redpanda_events_raw
WHERE length(_error) = 0;
```

## Redpanda-Specific Features

Take advantage of Redpanda's schema registry for schema evolution:

```sql
-- Using Avro format with Redpanda's schema registry
CREATE TABLE redpanda_avro_events (
    event_time String,
    user_id String,
    event_type String
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'redpanda-1:9092',
    kafka_topic_list = 'events-avro',
    kafka_group_name = 'clickhouse-avro-consumer',
    kafka_format = 'AvroConfluent',
    format_avro_schema_registry_url = 'http://redpanda-schema-registry:8081';
```

## Monitoring Consumer Group in Redpanda

```bash
# Using rpk (Redpanda CLI)
rpk group describe clickhouse-consumers

# Check lag per partition
rpk group list
rpk topic consume events --num 1  # Sample latest message
```

## Latency Benchmarking

Measure end-to-end latency from Redpanda to ClickHouse:

```sql
SELECT
    toStartOfSecond(now()) AS second,
    count() AS events_ingested,
    max(now() - toDateTime(event_time)) AS max_lag_seconds
FROM events
WHERE event_time >= now() - INTERVAL 1 MINUTE
GROUP BY second
ORDER BY second;
```

Redpanda's typical end-to-end latency to ClickHouse is under 1 second for most workloads when using `kafka_flush_interval_ms = 1000`.

## Summary

Building a Redpanda to ClickHouse pipeline requires no special configuration beyond pointing the Kafka engine at your Redpanda brokers. Use SASL_SSL authentication for production clusters, leverage Redpanda's schema registry for Avro format, and monitor consumer group lag using `rpk group describe`. Redpanda's simpler operations model makes it an attractive replacement for Kafka in ClickHouse streaming pipelines.
