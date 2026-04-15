# How to Stream Data from Apache Pulsar to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Apache Pulsar, Streaming, Integration, Data Pipeline, Kafka

Description: Stream data from Apache Pulsar into ClickHouse using Pulsar's Kafka compatibility layer or a custom consumer application.

---

Apache Pulsar is a cloud-native messaging platform with a Kafka-compatible API. You can stream data from Pulsar into ClickHouse using either the Kafka compatibility endpoint or a custom consumer.

## Architecture Overview

```text
Apache Pulsar --> Kafka Protocol Adapter --> ClickHouse Kafka Engine
           or
Apache Pulsar --> Custom Consumer App --> ClickHouse HTTP/Native
```

## Option 1: Pulsar Kafka Compatibility Layer

Pulsar supports the Kafka protocol through the KoP (Kafka on Pulsar) protocol handler. KoP is not bundled with Pulsar and must be downloaded separately from the [KoP releases page](https://github.com/streamnative/kop/releases). Place the `.nar` file in a `protocols` directory, then enable it in your Pulsar configuration:

```bash
# broker.conf
messagingProtocols=kafka
protocolHandlerDirectory=./protocols
kafkaListeners=PLAINTEXT://0.0.0.0:9092
kafkaAdvertisedListeners=PLAINTEXT://pulsar-host:9092
```

Once the Kafka listener is enabled, configure a ClickHouse Kafka engine table exactly as you would for standard Kafka:

```sql
CREATE TABLE pulsar_events_queue (
    event_time DateTime,
    event_type String,
    user_id UInt64,
    payload String
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'pulsar-host:9092',
    kafka_topic_list = 'persistent://public/default/events',
    kafka_group_name = 'clickhouse-consumer',
    kafka_format = 'JSONEachRow';
```

Create the destination table:

```sql
CREATE TABLE events (
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt64,
    payload String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, event_time);
```

Create a materialized view to move data from the Kafka engine to the destination table:

```sql
CREATE MATERIALIZED VIEW pulsar_to_events TO events AS
SELECT * FROM pulsar_events_queue;
```

## Option 2: Custom Pulsar Consumer

For more control, write a consumer application in Python using the `pulsar-client` library:

```python
import pulsar
import clickhouse_driver
import json

pulsar_client = pulsar.Client('pulsar://localhost:6650')
consumer = pulsar_client.subscribe('events', 'clickhouse-sub')

ch_client = clickhouse_driver.Client(host='localhost')

buffer = []

while True:
    try:
        msg = consumer.receive(timeout_millis=1000)
        data = json.loads(msg.data())
        buffer.append(data)
        consumer.acknowledge(msg)
    except pulsar.Timeout:
        pass

    if len(buffer) >= 1000:
        ch_client.execute(
            'INSERT INTO events (event_time, event_type, user_id, payload) VALUES',
            buffer
        )
        buffer = []
```

## Topic Naming in Pulsar

Pulsar topic names follow a four-part naming scheme: `{persistent|non-persistent}://tenant/namespace/topic`. When using the Kafka compatibility layer, use the full Pulsar topic name as the Kafka topic:

```sql
kafka_topic_list = 'persistent://public/default/events',
```

## Monitor Consumer Lag

Check consumer lag via the Pulsar admin API:

```bash
pulsar-admin topics stats persistent://public/default/events
```

Or check ClickHouse Kafka consumer metrics:

```sql
SELECT * FROM system.kafka_consumers;
```

## Summary

Apache Pulsar integrates with ClickHouse most easily via its Kafka compatibility layer, which allows you to reuse the ClickHouse Kafka engine without any code changes. For advanced use cases or when Kafka compatibility is disabled, a custom Python consumer with batch inserts provides a reliable alternative.
