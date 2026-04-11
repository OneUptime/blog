# How to Use MySQL with Apache Kafka for CDC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Kafka, CDC, Debezium, Replication

Description: Learn how to stream MySQL change data capture (CDC) events to Apache Kafka using Debezium Kafka Connect to enable real-time data pipelines and event-driven systems.

---

## What Is CDC with Kafka?

Change Data Capture (CDC) captures every INSERT, UPDATE, and DELETE from MySQL's binary log and publishes them as events to Apache Kafka. Debezium is the most widely used connector for this, running as a Kafka Connect plugin.

## Prerequisites

- MySQL 8.0 with binary logging enabled
- Apache Kafka + Kafka Connect running
- Debezium MySQL connector installed

## Enabling MySQL Binary Logging

Binary logging must be enabled with row format for Debezium to capture row-level changes:

```ini
[mysqld]
server-id         = 1
log_bin           = /var/log/mysql/mysql-bin.log
binlog_format     = ROW
binlog_row_image  = FULL
binlog_expire_logs_seconds = 604800
```

Restart MySQL after editing `my.cnf`.

## Creating a Debezium User

```sql
CREATE USER 'debezium'@'%' IDENTIFIED BY 'strong_password';

GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT
  ON *.* TO 'debezium'@'%';

FLUSH PRIVILEGES;
```

## Deploying the Debezium MySQL Connector

Register the connector via the Kafka Connect REST API:

```bash
curl -X POST http://kafka-connect:8083/connectors \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "mysql-cdc-connector",
    "config": {
      "connector.class": "io.debezium.connector.mysql.MySqlConnector",
      "tasks.max": "1",
      "database.hostname": "mysql-host",
      "database.port": "3306",
      "database.user": "debezium",
      "database.password": "strong_password",
      "database.server.id": "184054",
      "topic.prefix": "myapp",
      "database.include.list": "orders_db",
      "table.include.list": "orders_db.orders,orders_db.customers",
      "schema.history.internal.kafka.bootstrap.servers": "kafka:9092",
      "schema.history.internal.kafka.topic": "schema-changes.orders_db"
    }
  }'
```

## Kafka Topic Structure

Debezium creates one topic per table: `{prefix}.{database}.{table}`

For the config above: `myapp.orders_db.orders`

Each message is a JSON envelope:

```json
{
  "before": null,
  "after": {
    "id": 1001,
    "customer_id": 42,
    "total_amount": 299.99,
    "status": "pending"
  },
  "op": "c",
  "ts_ms": 1712001234567
}
```

`op` values: `c` = create, `u` = update, `d` = delete, `r` = snapshot read.

## Consuming CDC Events

Consume and process the events with a Kafka consumer:

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'myapp.orders_db.orders',
    bootstrap_servers=['kafka:9092'],
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    group_id='order-processor'
)

for msg in consumer:
    event = msg.value
    op = event.get('op')
    after = event.get('after', {})

    if op == 'c':
        print(f"New order: {after['id']}, amount: {after['total_amount']}")
    elif op == 'u':
        print(f"Order updated: {after['id']}, status: {after['status']}")
    elif op == 'd':
        before = event.get('before', {})
        print(f"Order deleted: {before['id']}")
```

## Summary

Stream MySQL CDC to Kafka using Debezium by enabling binary logging in row format, creating a replication user, and deploying the Debezium MySQL connector via Kafka Connect REST API. Each table change is published to a dedicated Kafka topic as a structured JSON event with before/after state and operation type. Downstream consumers react to these events for real-time processing, cache invalidation, or search index updates.
