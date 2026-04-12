# How to Use Debezium for MySQL Change Data Capture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Debezium, Change Data Capture, Kafka, CDC, Event Streaming

Description: Learn how to set up Debezium to capture every insert, update, and delete from MySQL and stream the changes to Kafka in real time.

---

## What Is Change Data Capture

Change Data Capture (CDC) is a technique for tracking data changes in a database and streaming those changes to downstream systems. Instead of polling the database repeatedly, CDC reads the MySQL binary log and produces a real-time event for every row-level change. Debezium is an open-source CDC platform built on top of Kafka Connect that supports MySQL natively.

## How Debezium Reads MySQL Changes

Debezium acts as a MySQL replica. It connects to MySQL using a replication user, reads the binary log events, converts them into structured change events, and publishes them to Kafka topics. Each event contains the before and after image of the row, the operation type (INSERT, UPDATE, DELETE), and metadata about the source.

## Prerequisites

Before configuring Debezium, ensure:
- MySQL binary logging is enabled with `binlog_format = ROW`
- A dedicated replication user exists with the right privileges
- Kafka and Kafka Connect are running

## Enabling Binary Logging in MySQL

```ini
[mysqld]
server-id = 1
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW
binlog_row_image = FULL
expire_logs_days = 7
```

Restart MySQL after editing:

```bash
sudo systemctl restart mysql
```

## Creating the Debezium Replication User

```sql
CREATE USER 'debezium'@'%' IDENTIFIED BY 'strong_password';

GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT
  ON *.* TO 'debezium'@'%';

FLUSH PRIVILEGES;
```

## Registering the Debezium MySQL Connector

Submit the connector configuration to Kafka Connect via its REST API:

```bash
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mysql-connector",
    "config": {
      "connector.class": "io.debezium.connector.mysql.MySqlConnector",
      "tasks.max": "1",
      "database.hostname": "mysql-host",
      "database.port": "3306",
      "database.user": "debezium",
      "database.password": "strong_password",
      "database.server.id": "184054",
      "topic.prefix": "myapp",
      "database.include.list": "myapp",
      "table.include.list": "myapp.orders,myapp.users",
      "schema.history.internal.kafka.bootstrap.servers": "kafka:9092",
      "schema.history.internal.kafka.topic": "schema-changes.myapp"
    }
  }'
```

## Understanding the Change Event Format

Each Debezium event published to Kafka looks like this for an UPDATE:

```text
{
  "schema": { ... },
  "payload": {
    "before": {
      "id": 42,
      "status": "pending",
      "updated_at": "2026-03-31T10:00:00Z"
    },
    "after": {
      "id": 42,
      "status": "shipped",
      "updated_at": "2026-03-31T10:05:00Z"
    },
    "source": {
      "db": "myapp",
      "table": "orders",
      "ts_ms": 1743422700000,
      "gtid": null,
      "file": "mysql-bin.000003",
      "pos": 154
    },
    "op": "u",
    "ts_ms": 1743422700000
  }
}
```

The `op` field indicates the operation: `c` for create (INSERT), `u` for update (UPDATE), `d` for delete (DELETE), and `r` for read (snapshot).

## Consuming Change Events

A Kafka consumer reading from the `myapp.myapp.orders` topic receives all changes to the orders table:

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'myapp.myapp.orders',
    bootstrap_servers=['kafka:9092'],
    auto_offset_reset='earliest',
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for message in consumer:
    event = message.value
    op = event['payload']['op']
    after = event['payload'].get('after', {})
    print(f"Operation: {op}, Order ID: {after.get('id')}, Status: {after.get('status')}")
```

## Checking Connector Status

Verify the connector is running and healthy:

```bash
curl http://localhost:8083/connectors/mysql-connector/status
```

Expected output:

```text
{
  "name": "mysql-connector",
  "connector": {"state": "RUNNING", "worker_id": "kafka-connect:8083"},
  "tasks": [{"id": 0, "state": "RUNNING", "worker_id": "kafka-connect:8083"}]
}
```

## Summary

Debezium enables real-time MySQL Change Data Capture by reading the binary log through a replication connection and publishing structured change events to Kafka. By enabling row-based binary logging, creating a dedicated replication user, and registering the Debezium MySQL connector, you can stream every insert, update, and delete to downstream consumers for use cases like cache invalidation, search index updates, and event-driven microservices.
