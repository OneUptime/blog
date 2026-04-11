# How to Stream MySQL Changes to Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Kafka, Change Data Capture, Replication, Event

Description: Learn how to stream MySQL row changes to Apache Kafka using Debezium Kafka Connect so downstream services can react to database events in real time.

---

Streaming MySQL changes to Apache Kafka decouples producers from consumers and enables event-driven architectures. Debezium's MySQL connector, running inside Kafka Connect, reads binary logs and publishes insert, update, and delete events as structured messages to Kafka topics.

## Prerequisites

You need a running MySQL instance with binary logging enabled, a Kafka cluster, and Kafka Connect. Docker Compose is the fastest way to get started:

```yaml
version: "3.8"
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    depends_on: [zookeeper]
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  connect:
    image: debezium/connect:2.6
    depends_on: [kafka]
    ports:
      - "8083:8083"
    environment:
      BOOTSTRAP_SERVERS: kafka:9092
      GROUP_ID: 1
      CONFIG_STORAGE_TOPIC: connect_configs
      OFFSET_STORAGE_TOPIC: connect_offsets
      STATUS_STORAGE_TOPIC: connect_statuses
```

Start the stack:

```bash
docker compose up -d
```

## Configuring MySQL

Enable row-based binary logging:

```ini
[mysqld]
server-id     = 1
log-bin       = mysql-bin
binlog_format = ROW
```

Create a replication user:

```sql
CREATE USER 'debezium'@'%' IDENTIFIED WITH mysql_native_password BY 'dbz_password';
GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'debezium'@'%';
FLUSH PRIVILEGES;
```

## Registering the Debezium MySQL Connector

Submit the connector configuration to Kafka Connect via its REST API:

```bash
curl -X POST http://localhost:8083/connectors \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "mysql-source",
    "config": {
      "connector.class": "io.debezium.connector.mysql.MySqlConnector",
      "database.hostname": "mysql",
      "database.port": "3306",
      "database.user": "debezium",
      "database.password": "dbz_password",
      "database.server.id": "184054",
      "topic.prefix": "myapp",
      "database.include.list": "myapp",
      "schema.history.internal.kafka.bootstrap.servers": "kafka:9092",
      "schema.history.internal.kafka.topic": "myapp.schema-history"
    }
  }'
```

## Verifying Events in Kafka

Check the connector status and then consume events:

```bash
curl http://localhost:8083/connectors/mysql-source/status

docker exec -it kafka kafka-console-consumer \
  --bootstrap-server kafka:9092 \
  --topic myapp.myapp.orders \
  --from-beginning \
  --max-messages 5
```

Each message is a JSON envelope containing `before` and `after` states:

```json
{
  "before": null,
  "after": {
    "id": 1,
    "customer_id": 10,
    "amount": 250.00,
    "status": "pending"
  },
  "op": "c",
  "ts_ms": 1711900800000
}
```

## Configuring Topic-Per-Table Routing

By default, Debezium creates one topic per table named `prefix.database.table`. To rename topics using a Single Message Transform:

```json
{
  "transforms": "route",
  "transforms.route.type": "org.apache.kafka.connect.transforms.RegexRouter",
  "transforms.route.regex": "myapp\\.myapp\\.(.*)",
  "transforms.route.replacement": "myapp-events"
}
```

## Summary

Streaming MySQL changes to Kafka via Debezium creates a durable, replayable event log of every row change. The connector reads binary logs without polling, delivers low-latency events, and preserves before and after states. Downstream consumers - search indexers, caches, analytics pipelines - subscribe to Kafka topics independently, making the architecture resilient and easy to extend.
