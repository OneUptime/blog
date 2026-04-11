# What Is Debezium for MySQL CDC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Debezium, Change Data Capture, Kafka

Description: Debezium is an open-source CDC platform that captures every row-level change in MySQL's binary log and streams them as events to Apache Kafka.

---

## Overview

Debezium is an open-source Change Data Capture (CDC) platform that monitors database transaction logs and streams row-level change events to Apache Kafka. For MySQL, Debezium acts as a replication client - it reads the binary log and converts each INSERT, UPDATE, and DELETE into a structured Kafka event in real time.

CDC with Debezium is widely used for:
- Event-driven microservices (reacting to database changes)
- Real-time data synchronization to data warehouses
- Cache invalidation
- Audit logging and compliance

## Architecture

```text
MySQL (binlog) --> Debezium MySQL Connector --> Kafka Connect --> Kafka Topics
                                                                       |
                                             Elasticsearch, Snowflake, downstream services
```

## Prerequisites

- MySQL 5.7+ or 8.0 with binary logging enabled
- Binary log format must be ROW
- Apache Kafka and Kafka Connect

## Enabling MySQL Binary Log for Debezium

```text
[mysqld]
server-id = 1
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW
binlog_row_image = FULL
expire_logs_days = 10
```

## Creating the Debezium MySQL User

```sql
CREATE USER 'debezium'@'%' IDENTIFIED BY 'dbz_password';
GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'debezium'@'%';
FLUSH PRIVILEGES;
```

## Deploying Debezium with Docker

```bash
# Start Kafka and Zookeeper
docker-compose up -d zookeeper kafka

# Start Kafka Connect with Debezium
docker run -it --rm --name connect   -p 8083:8083   -e GROUP_ID=1   -e CONFIG_STORAGE_TOPIC=my_connect_configs   -e OFFSET_STORAGE_TOPIC=my_connect_offsets   -e STATUS_STORAGE_TOPIC=my_connect_statuses   --link kafka   debezium/connect:2.4
```

## Registering the MySQL Connector

```bash
curl -X POST http://localhost:8083/connectors   -H 'Content-Type: application/json'   -d '{
    "name": "mysql-connector",
    "config": {
      "connector.class": "io.debezium.connector.mysql.MySqlConnector",
      "database.hostname": "mysql-host",
      "database.port": "3306",
      "database.user": "debezium",
      "database.password": "dbz_password",
      "database.server.id": "184054",
      "topic.prefix": "myapp",
      "database.include.list": "myapp",
      "schema.history.internal.kafka.bootstrap.servers": "kafka:9092",
      "schema.history.internal.kafka.topic": "schema-changes.myapp"
    }
  }'
```

## Kafka Topic Structure

Debezium creates topics per table:

```text
myapp.myapp.customers   - changes to the customers table
myapp.myapp.orders      - changes to the orders table
```

## Event Format (Kafka Message)

Each change event looks like this:

```json
{
  "schema": { ... },
  "payload": {
    "before": {
      "id": 1,
      "name": "Alice",
      "email": "alice@example.com"
    },
    "after": {
      "id": 1,
      "name": "Alice Smith",
      "email": "alice@example.com"
    },
    "source": {
      "db": "myapp",
      "table": "customers",
      "ts_ms": 1743430800000,
      "file": "mysql-bin.000042",
      "pos": 12345,
      "gtid": "3E11FA47-71CA-11E1-9E33-C80AA9429562:23"
    },
    "op": "u",
    "ts_ms": 1743430800100
  }
}
```

Operation codes: `c` = create, `u` = update, `d` = delete, `r` = read (snapshot)

## Consuming Change Events

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'myapp.myapp.orders',
    bootstrap_servers=['kafka:9092'],
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for msg in consumer:
    event = msg.value
    op = event['payload']['op']
    if op == 'c':
        print(f"New order: {event['payload']['after']}")
    elif op == 'u':
        print(f"Order updated: {event['payload']['after']}")
    elif op == 'd':
        print(f"Order deleted: {event['payload']['before']['id']}")
```

## Monitoring Connector Status

```bash
# Check connector status
curl http://localhost:8083/connectors/mysql-connector/status

# List all connectors
curl http://localhost:8083/connectors
```

## Summary

Debezium provides reliable, low-latency MySQL CDC by reading the binary log and streaming row-level changes to Kafka. It captures the full before/after state of every changed row, enabling real-time event-driven architectures, data synchronization pipelines, and audit trails. Binary log ROW format and a dedicated replication user are the two key MySQL prerequisites for a Debezium deployment.
