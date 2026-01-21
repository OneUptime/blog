# How to Set Up Kafka Connect for Database CDC with Debezium

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Kafka Connect, Debezium, CDC, Change Data Capture, PostgreSQL, MySQL, Database Streaming

Description: A comprehensive guide to setting up Kafka Connect with Debezium for change data capture, covering connector configuration, schema evolution, and best practices for streaming database changes to Kafka.

---

Change Data Capture (CDC) enables real-time streaming of database changes to Kafka. Debezium is the leading open-source CDC platform that captures row-level changes and publishes them to Kafka topics. This guide covers setting up Debezium with Kafka Connect for PostgreSQL and MySQL databases.

## Understanding CDC and Debezium

### What is CDC?

Change Data Capture captures INSERT, UPDATE, and DELETE operations from database transaction logs, enabling:

- Real-time data synchronization
- Event-driven microservices
- Data warehouse updates
- Audit logging
- Cache invalidation

### Debezium Architecture

```
Database -> Transaction Log -> Debezium Connector -> Kafka Connect -> Kafka Topics
```

## Setting Up Kafka Connect

### Docker Compose Setup

```yaml
version: '3.8'

services:
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
    networks:
      - kafka-net

  kafka-connect:
    image: debezium/connect:2.5
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
    networks:
      - kafka-net

  postgres:
    image: postgres:16
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
    networks:
      - kafka-net

  mysql:
    image: mysql:8.0
    container_name: mysql
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: mydb
    command:
      - "--server-id=1"
      - "--log-bin=mysql-bin"
      - "--binlog-format=ROW"
      - "--binlog-row-image=FULL"
    networks:
      - kafka-net

networks:
  kafka-net:
    driver: bridge
```

## PostgreSQL CDC Setup

### Enable Logical Replication

```sql
-- Check wal_level setting
SHOW wal_level;  -- Should be 'logical'

-- Create publication for CDC
CREATE PUBLICATION dbz_publication FOR ALL TABLES;

-- Or for specific tables
CREATE PUBLICATION dbz_publication FOR TABLE orders, customers;

-- Create replication slot (optional - Debezium can create this)
SELECT pg_create_logical_replication_slot('debezium_slot', 'pgoutput');
```

### PostgreSQL Connector Configuration

```json
{
  "name": "postgres-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "postgres",
    "database.password": "postgres",
    "database.dbname": "mydb",
    "topic.prefix": "myapp",
    "table.include.list": "public.orders,public.customers",
    "plugin.name": "pgoutput",
    "slot.name": "debezium_slot",
    "publication.name": "dbz_publication",

    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "key.converter.schemas.enable": "true",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter.schemas.enable": "true",

    "snapshot.mode": "initial",
    "decimal.handling.mode": "string",
    "time.precision.mode": "connect",

    "heartbeat.interval.ms": "10000",
    "heartbeat.topics.prefix": "__debezium-heartbeat",

    "tombstones.on.delete": "true",
    "delete.handling.mode": "rewrite"
  }
}
```

### Deploy PostgreSQL Connector

```bash
# Create connector
curl -X POST -H "Content-Type: application/json" \
  --data @postgres-connector.json \
  http://localhost:8083/connectors

# Check connector status
curl http://localhost:8083/connectors/postgres-connector/status

# List connectors
curl http://localhost:8083/connectors
```

## MySQL CDC Setup

### Configure MySQL for CDC

```sql
-- Check binary logging
SHOW VARIABLES LIKE 'log_bin';  -- Should be ON
SHOW VARIABLES LIKE 'binlog_format';  -- Should be ROW
SHOW VARIABLES LIKE 'binlog_row_image';  -- Should be FULL

-- Create CDC user
CREATE USER 'debezium'@'%' IDENTIFIED BY 'debezium';
GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'debezium'@'%';
FLUSH PRIVILEGES;
```

### MySQL Connector Configuration

```json
{
  "name": "mysql-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "database.hostname": "mysql",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "debezium",
    "database.server.id": "12345",
    "topic.prefix": "myapp",
    "database.include.list": "mydb",
    "table.include.list": "mydb.orders,mydb.customers",
    "schema.history.internal.kafka.bootstrap.servers": "kafka:9092",
    "schema.history.internal.kafka.topic": "schema-changes.mydb",

    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "key.converter.schemas.enable": "true",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter.schemas.enable": "true",

    "snapshot.mode": "initial",
    "include.schema.changes": "true",
    "decimal.handling.mode": "string",

    "tombstones.on.delete": "true"
  }
}
```

## Understanding CDC Messages

### Message Structure

```json
{
  "schema": { ... },
  "payload": {
    "before": {
      "id": 1,
      "name": "John",
      "email": "john@example.com"
    },
    "after": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    "source": {
      "version": "2.5.0",
      "connector": "postgresql",
      "name": "myapp",
      "ts_ms": 1706284800000,
      "snapshot": "false",
      "db": "mydb",
      "schema": "public",
      "table": "customers",
      "txId": 12345,
      "lsn": 123456789
    },
    "op": "u",
    "ts_ms": 1706284800123,
    "transaction": null
  }
}
```

### Operation Types

- **c**: Create (INSERT)
- **u**: Update
- **d**: Delete
- **r**: Read (snapshot)

## Consumer Implementation

### Java CDC Consumer

```java
import org.apache.kafka.clients.consumer.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.*;

public class CDCConsumer {
    private final Consumer<String, String> consumer;
    private final ObjectMapper mapper = new ObjectMapper();

    public CDCConsumer(String bootstrapServers, String groupId) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        this.consumer = new KafkaConsumer<>(props);
    }

    public void consume(String topic, CDCHandler handler) {
        consumer.subscribe(Collections.singletonList(topic));

        while (true) {
            ConsumerRecords<String, String> records =
                consumer.poll(Duration.ofMillis(1000));

            for (ConsumerRecord<String, String> record : records) {
                try {
                    JsonNode event = mapper.readTree(record.value());
                    JsonNode payload = event.get("payload");

                    String operation = payload.get("op").asText();
                    JsonNode before = payload.get("before");
                    JsonNode after = payload.get("after");

                    switch (operation) {
                        case "c":
                        case "r":
                            handler.onInsert(after);
                            break;
                        case "u":
                            handler.onUpdate(before, after);
                            break;
                        case "d":
                            handler.onDelete(before);
                            break;
                    }
                } catch (Exception e) {
                    System.err.println("Error processing CDC event: " + e.getMessage());
                }
            }
        }
    }

    interface CDCHandler {
        void onInsert(JsonNode data);
        void onUpdate(JsonNode before, JsonNode after);
        void onDelete(JsonNode data);
    }
}
```

### Python CDC Consumer

```python
from confluent_kafka import Consumer
import json
from typing import Callable, Dict, Any

class CDCConsumer:
    def __init__(self, bootstrap_servers: str, group_id: str):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'auto.offset.reset': 'earliest',
        }
        self.consumer = Consumer(self.config)

    def consume(self, topic: str,
                on_insert: Callable[[Dict], None],
                on_update: Callable[[Dict, Dict], None],
                on_delete: Callable[[Dict], None]):
        self.consumer.subscribe([topic])

        try:
            while True:
                msg = self.consumer.poll(timeout=1.0)

                if msg is None:
                    continue

                if msg.error():
                    print(f"Error: {msg.error()}")
                    continue

                try:
                    event = json.loads(msg.value().decode())
                    payload = event.get('payload', {})

                    operation = payload.get('op')
                    before = payload.get('before')
                    after = payload.get('after')

                    if operation in ('c', 'r'):
                        on_insert(after)
                    elif operation == 'u':
                        on_update(before, after)
                    elif operation == 'd':
                        on_delete(before)

                except json.JSONDecodeError as e:
                    print(f"JSON decode error: {e}")

        finally:
            self.consumer.close()


def main():
    consumer = CDCConsumer('localhost:9092', 'cdc-consumer-group')

    def handle_insert(data):
        print(f"INSERT: {data}")

    def handle_update(before, after):
        print(f"UPDATE: {before} -> {after}")

    def handle_delete(data):
        print(f"DELETE: {data}")

    consumer.consume(
        'myapp.public.customers',
        handle_insert,
        handle_update,
        handle_delete
    )


if __name__ == '__main__':
    main()
```

## Advanced Configuration

### Snapshot Modes

```json
{
  "snapshot.mode": "initial"
}
```

| Mode | Description |
|------|-------------|
| initial | Snapshot then stream changes |
| initial_only | Snapshot only, no streaming |
| never | No snapshot, only stream changes |
| when_needed | Snapshot if offsets unavailable |
| schema_only | Snapshot schema only |

### Single Message Transforms (SMTs)

```json
{
  "name": "postgres-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    ...

    "transforms": "unwrap,route",

    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": "false",
    "transforms.unwrap.delete.handling.mode": "rewrite",
    "transforms.unwrap.add.fields": "op,source.ts_ms",

    "transforms.route.type": "org.apache.kafka.connect.transforms.RegexRouter",
    "transforms.route.regex": "([^.]+)\\.([^.]+)\\.([^.]+)",
    "transforms.route.replacement": "cdc-$3"
  }
}
```

### Filtering

```json
{
  "config": {
    "table.include.list": "public.orders,public.customers",
    "column.exclude.list": "public.customers.password,public.customers.ssn",

    "message.key.columns": "public.orders:id,customer_id",

    "transforms": "filter",
    "transforms.filter.type": "io.debezium.transforms.Filter",
    "transforms.filter.language": "jsr223.groovy",
    "transforms.filter.condition": "value.after.status != 'DELETED'"
  }
}
```

## Monitoring Kafka Connect

### REST API Endpoints

```bash
# List connectors
curl http://localhost:8083/connectors

# Connector status
curl http://localhost:8083/connectors/postgres-connector/status

# Connector configuration
curl http://localhost:8083/connectors/postgres-connector/config

# Pause connector
curl -X PUT http://localhost:8083/connectors/postgres-connector/pause

# Resume connector
curl -X PUT http://localhost:8083/connectors/postgres-connector/resume

# Restart connector
curl -X POST http://localhost:8083/connectors/postgres-connector/restart

# Restart specific task
curl -X POST http://localhost:8083/connectors/postgres-connector/tasks/0/restart

# Delete connector
curl -X DELETE http://localhost:8083/connectors/postgres-connector
```

### JMX Metrics

Key metrics to monitor:

```
debezium.postgres.connector:type=connector-metrics,context=streaming
- NumberOfEventsFiltered
- MilliSecondsSinceLastEvent
- SourceEventPosition

kafka.connect:type=connector-task-metrics
- source-record-poll-rate
- source-record-write-rate
- offset-commit-success-rate
```

## Error Handling and Recovery

### Configure Error Handling

```json
{
  "config": {
    "errors.tolerance": "all",
    "errors.log.enable": "true",
    "errors.log.include.messages": "true",
    "errors.deadletterqueue.topic.name": "dlq-cdc-errors",
    "errors.deadletterqueue.topic.replication.factor": "1",
    "errors.deadletterqueue.context.headers.enable": "true"
  }
}
```

### Recovery from Failures

```bash
# Check current offset
curl http://localhost:8083/connectors/postgres-connector/offsets

# Reset offset (connector must be stopped)
curl -X DELETE http://localhost:8083/connectors/postgres-connector/offsets

# Recreate connector with new snapshot
curl -X DELETE http://localhost:8083/connectors/postgres-connector
curl -X POST -H "Content-Type: application/json" \
  --data @postgres-connector.json \
  http://localhost:8083/connectors
```

## Best Practices

### 1. Use Schema Registry

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

### 2. Configure Heartbeats

```json
{
  "config": {
    "heartbeat.interval.ms": "10000",
    "heartbeat.topics.prefix": "__debezium-heartbeat",
    "heartbeat.action.query": "INSERT INTO heartbeat (ts) VALUES (NOW())"
  }
}
```

### 3. Monitor Lag

```sql
-- PostgreSQL: Check replication slot lag
SELECT slot_name, pg_current_wal_lsn() - confirmed_flush_lsn AS lag_bytes
FROM pg_replication_slots;
```

### 4. Handle Schema Changes

```json
{
  "config": {
    "include.schema.changes": "true",
    "schema.history.internal.kafka.topic": "schema-changes",
    "schema.history.internal.kafka.recovery.attempts": "100"
  }
}
```

## Conclusion

Debezium with Kafka Connect provides a robust solution for database CDC:

1. **Capture all changes**: INSERT, UPDATE, DELETE operations
2. **Low latency**: Near real-time data streaming
3. **Fault tolerant**: Automatic recovery and exactly-once delivery
4. **Schema aware**: Track schema changes over time
5. **Extensible**: Transform and route data as needed

Start with basic configuration, then add transforms, filtering, and monitoring as your needs grow. Always test CDC pipelines thoroughly before production deployment.
