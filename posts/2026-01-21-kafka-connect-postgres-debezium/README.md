# How to Stream Data from PostgreSQL to Kafka with Debezium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, Kafka Connect, Debezium, PostgreSQL, CDC, Change Data Capture

Description: Learn how to stream real-time data changes from PostgreSQL to Kafka using Debezium, including setup, configuration, schema handling, and production best practices for change data capture.

---

Debezium captures row-level changes in PostgreSQL and streams them to Kafka in real-time. This enables event-driven architectures, data synchronization, and building materialized views without polling the database.

## Prerequisites

### PostgreSQL Configuration

Enable logical replication in PostgreSQL:

```sql
-- postgresql.conf
wal_level = logical
max_wal_senders = 4
max_replication_slots = 4
```

```sql
-- Create replication user
CREATE ROLE debezium WITH REPLICATION LOGIN PASSWORD 'debezium_password';

-- Grant permissions
GRANT USAGE ON SCHEMA public TO debezium;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO debezium;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO debezium;
```

### Create Publication

```sql
-- For specific tables
CREATE PUBLICATION debezium_publication FOR TABLE orders, customers, products;

-- Or for all tables
CREATE PUBLICATION debezium_publication FOR ALL TABLES;
```

## Docker Compose Setup

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mydb
    command:
      - "postgres"
      - "-c"
      - "wal_level=logical"
      - "-c"
      - "max_wal_senders=4"
      - "-c"
      - "max_replication_slots=4"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql

  kafka:
    image: apache/kafka:3.7.0
    container_name: kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk

  kafka-connect:
    image: debezium/connect:2.4
    container_name: kafka-connect
    ports:
      - "8083:8083"
    environment:
      BOOTSTRAP_SERVERS: kafka:9092
      GROUP_ID: connect-cluster
      CONFIG_STORAGE_TOPIC: connect-configs
      OFFSET_STORAGE_TOPIC: connect-offsets
      STATUS_STORAGE_TOPIC: connect-status
      CONFIG_STORAGE_REPLICATION_FACTOR: 1
      OFFSET_STORAGE_REPLICATION_FACTOR: 1
      STATUS_STORAGE_REPLICATION_FACTOR: 1
    depends_on:
      - kafka
      - postgres

volumes:
  postgres-data:
```

## Connector Configuration

### Basic Configuration

```json
{
  "name": "postgres-source",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "debezium_password",
    "database.dbname": "mydb",
    "topic.prefix": "cdc",
    "plugin.name": "pgoutput",
    "publication.name": "debezium_publication",
    "slot.name": "debezium_slot",
    "table.include.list": "public.orders,public.customers",
    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "key.converter.schemas.enable": "true",
    "value.converter.schemas.enable": "true"
  }
}
```

### Production Configuration

```json
{
  "name": "postgres-production",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres-primary.example.com",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "${secrets:database-credentials:password}",
    "database.dbname": "production",
    "topic.prefix": "prod.cdc",
    "plugin.name": "pgoutput",
    "publication.name": "debezium_pub",
    "slot.name": "debezium_prod",

    "table.include.list": "public.orders,public.order_items,public.customers",
    "column.exclude.list": "public.customers.ssn,public.customers.credit_card",

    "snapshot.mode": "initial",
    "snapshot.fetch.size": "10000",

    "tombstones.on.delete": "true",
    "decimal.handling.mode": "string",
    "time.precision.mode": "connect",

    "heartbeat.interval.ms": "10000",
    "heartbeat.topics.prefix": "__debezium-heartbeat",

    "poll.interval.ms": "500",
    "max.batch.size": "2048",
    "max.queue.size": "8192",

    "transforms": "route,unwrap",
    "transforms.route.type": "org.apache.kafka.connect.transforms.RegexRouter",
    "transforms.route.regex": "([^.]+)\\.([^.]+)\\.([^.]+)",
    "transforms.route.replacement": "$3",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": "false",
    "transforms.unwrap.delete.handling.mode": "rewrite",
    "transforms.unwrap.add.fields": "op,table,lsn,source.ts_ms",

    "errors.tolerance": "all",
    "errors.log.enable": "true",
    "errors.log.include.messages": "true",
    "errors.deadletterqueue.topic.name": "cdc-errors",
    "errors.deadletterqueue.topic.replication.factor": "3"
  }
}
```

## Deploy Connector

```bash
# Create connector
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d @postgres-connector.json

# Check status
curl http://localhost:8083/connectors/postgres-source/status | jq

# List connectors
curl http://localhost:8083/connectors

# Get connector config
curl http://localhost:8083/connectors/postgres-source/config | jq

# Restart connector
curl -X POST http://localhost:8083/connectors/postgres-source/restart

# Delete connector
curl -X DELETE http://localhost:8083/connectors/postgres-source
```

## Message Format

### Default Debezium Format

```json
{
  "schema": {...},
  "payload": {
    "before": null,
    "after": {
      "id": 1001,
      "customer_id": "cust-123",
      "total": "150.00",
      "status": "pending",
      "created_at": 1705320000000
    },
    "source": {
      "version": "2.4.0.Final",
      "connector": "postgresql",
      "name": "cdc",
      "ts_ms": 1705320000123,
      "snapshot": "false",
      "db": "mydb",
      "schema": "public",
      "table": "orders",
      "txId": 1234,
      "lsn": 123456789,
      "xmin": null
    },
    "op": "c",
    "ts_ms": 1705320000456,
    "transaction": {
      "id": "1234",
      "total_order": 1,
      "data_collection_order": 1
    }
  }
}
```

### Unwrapped Format (with ExtractNewRecordState)

```json
{
  "id": 1001,
  "customer_id": "cust-123",
  "total": "150.00",
  "status": "pending",
  "created_at": 1705320000000,
  "__op": "c",
  "__table": "orders",
  "__lsn": 123456789,
  "__source_ts_ms": 1705320000123
}
```

## Consuming CDC Events

### Python Consumer

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'orders',  # Topic name after transform
    bootstrap_servers=['localhost:9092'],
    group_id='order-processor',
    auto_offset_reset='earliest',
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for message in consumer:
    record = message.value

    # Check operation type
    op = record.get('__op', 'r')  # r=read (snapshot), c=create, u=update, d=delete

    if op == 'c':
        print(f"New order: {record['id']}")
        process_new_order(record)
    elif op == 'u':
        print(f"Updated order: {record['id']}")
        process_order_update(record)
    elif op == 'd':
        print(f"Deleted order: {record['id']}")
        process_order_delete(record)
```

### Java Consumer with Debezium Format

```java
import io.debezium.data.Envelope;
import org.apache.kafka.clients.consumer.*;

public class CDCConsumer {
    public void consume() {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "cdc-processor");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);

        Consumer<String, String> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(List.of("cdc.public.orders"));

        ObjectMapper mapper = new ObjectMapper();

        while (true) {
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));

            for (ConsumerRecord<String, String> record : records) {
                JsonNode envelope = mapper.readTree(record.value());
                JsonNode payload = envelope.get("payload");

                String op = payload.get("op").asText();
                JsonNode before = payload.get("before");
                JsonNode after = payload.get("after");

                switch (op) {
                    case "c" -> handleInsert(after);
                    case "u" -> handleUpdate(before, after);
                    case "d" -> handleDelete(before);
                    case "r" -> handleSnapshot(after);
                }
            }
        }
    }
}
```

## Snapshot Modes

```json
{
  "config": {
    "snapshot.mode": "initial"
  }
}
```

| Mode | Description |
|------|-------------|
| `initial` | Snapshot on first run, then stream changes |
| `initial_only` | Only snapshot, no streaming |
| `never` | No snapshot, only stream changes |
| `when_needed` | Snapshot if offset not available |
| `exported` | Snapshot using pg_export_snapshot |
| `custom` | Custom snapshot implementation |

## Schema Changes

### Handling DDL Events

```json
{
  "config": {
    "include.schema.changes": "true",
    "schema.history.internal.kafka.topic": "schema-changes.mydb",
    "schema.history.internal.kafka.bootstrap.servers": "kafka:9092"
  }
}
```

### Schema Compatibility

```json
{
  "config": {
    "key.converter": "io.confluent.connect.avro.AvroConverter",
    "key.converter.schema.registry.url": "http://schema-registry:8081",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter.schema.registry.url": "http://schema-registry:8081"
  }
}
```

## Monitoring

### JMX Metrics

```yaml
# prometheus-jmx-config.yml
rules:
  - pattern: "debezium.postgres<type=connector-metrics, context=(.+), server=(.+)><>(.+)"
    name: "debezium_postgres_$3"
    labels:
      context: "$1"
      server: "$2"

  - pattern: "debezium.postgres<type=connector-metrics, context=streaming, server=(.+)><>MilliSecondsBehindSource"
    name: "debezium_streaming_lag_ms"
    labels:
      server: "$1"
```

### Key Metrics

```bash
# Streaming lag
debezium_streaming_lag_ms

# Events processed
debezium_postgres_total_number_of_events_seen

# Snapshot status
debezium_postgres_snapshot_completed
debezium_postgres_snapshot_running

# Replication slot
debezium_postgres_connected
```

## Troubleshooting

### Replication Slot Issues

```sql
-- View replication slots
SELECT * FROM pg_replication_slots;

-- Check slot lag
SELECT slot_name, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag
FROM pg_replication_slots;

-- Drop orphaned slot
SELECT pg_drop_replication_slot('debezium_slot');
```

### Connector Restart

```bash
# Restart task
curl -X POST http://localhost:8083/connectors/postgres-source/tasks/0/restart

# Get task status
curl http://localhost:8083/connectors/postgres-source/tasks/0/status
```

### Reset Offsets

```bash
# Stop connector first
curl -X PUT http://localhost:8083/connectors/postgres-source/pause

# Delete connector
curl -X DELETE http://localhost:8083/connectors/postgres-source

# Reset offsets by deleting from offset topic or recreating connector
# with snapshot.mode=initial
```

## Best Practices

1. **Use dedicated replication user** - Minimal privileges
2. **Monitor replication lag** - Alert on growing lag
3. **Set appropriate heartbeat** - Prevent slot from falling behind
4. **Use Schema Registry** - For schema evolution
5. **Implement idempotent consumers** - Handle redeliveries
6. **Configure error handling** - Use dead letter queue

## Summary

| Configuration | Use Case |
|--------------|----------|
| `snapshot.mode=initial` | New deployments |
| `snapshot.mode=never` | Resuming from offset |
| `ExtractNewRecordState` | Simplified message format |
| Schema Registry | Production with schema evolution |

Debezium with PostgreSQL provides reliable, real-time CDC that enables event-driven architectures without database polling overhead.
