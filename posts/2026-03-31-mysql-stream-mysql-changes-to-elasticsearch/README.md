# How to Stream MySQL Changes to Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Elasticsearch, Change Data Capture, Search, Replication

Description: Learn how to synchronize MySQL row changes to Elasticsearch in real time using Debezium and the Kafka Connect Elasticsearch Sink connector.

---

Keeping Elasticsearch in sync with a MySQL source of truth is a common requirement for full-text search, analytics dashboards, and autocomplete features. Rather than dual-writing from application code, the cleanest approach uses CDC: Debezium reads the MySQL binary log and forwards events through Kafka to the Elasticsearch Sink connector.

## Architecture Overview

The pipeline consists of three stages:

```text
MySQL binlog --> Debezium MySQL Source --> Kafka topic --> Elasticsearch Sink --> Elasticsearch index
```

The source and sink connectors both run inside Kafka Connect, which handles fault tolerance and offset management.

## Setting Up the Stack

Use Docker Compose to run the required services:

```yaml
version: "3.8"
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: myapp
    command: --server-id=1 --log-bin=mysql-bin --binlog-format=ROW

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
    ports: ["8083:8083"]
    environment:
      BOOTSTRAP_SERVERS: kafka:9092
      GROUP_ID: 1
      CONFIG_STORAGE_TOPIC: connect_configs
      OFFSET_STORAGE_TOPIC: connect_offsets
      STATUS_STORAGE_TOPIC: connect_statuses

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
    environment:
      discovery.type: single-node
      xpack.security.enabled: "false"
    ports: ["9200:9200"]
```

## Registering the MySQL Source Connector

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
      "database.password": "dbz_pass",
      "database.server.id": "1",
      "topic.prefix": "myapp",
      "database.include.list": "myapp",
      "table.include.list": "myapp.products",
      "schema.history.internal.kafka.bootstrap.servers": "kafka:9092",
      "schema.history.internal.kafka.topic": "myapp.schema-history"
    }
  }'
```

## Installing and Registering the Elasticsearch Sink Connector

The Confluent Elasticsearch Sink connector is not bundled with Debezium. Install it into the Connect plugin path:

```bash
confluent-hub install confluentinc/kafka-connect-elasticsearch:14.0.12 \
  --component-dir /kafka/connect
```

Register the sink connector:

```bash
curl -X POST http://localhost:8083/connectors \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "es-sink",
    "config": {
      "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
      "tasks.max": "1",
      "topics": "myapp.myapp.products",
      "connection.url": "http://elasticsearch:9200",
      "key.ignore": "false",
      "schema.ignore": "true",
      "transforms": "unwrap",
      "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
      "transforms.unwrap.drop.tombstones": "false"
    }
  }'
```

The `ExtractNewRecordState` transform flattens the Debezium envelope so Elasticsearch receives the plain row data rather than the `before`/`after` wrapper.

## Verifying the Sync

Insert a row into MySQL and query Elasticsearch:

```bash
mysql -u root -prootpass myapp -e "INSERT INTO products (name, price) VALUES ('Widget', 9.99);"

curl http://localhost:9200/myapp.myapp.products/_search?pretty
```

## Handling Deletes

Debezium emits a tombstone message (null value) for deleted rows. Configure the sink to handle this:

```json
"behavior.on.null.values": "delete"
```

## Summary

Streaming MySQL changes to Elasticsearch via Debezium and Kafka Connect keeps search indexes automatically synchronized without application-level dual writes. The pipeline is fault-tolerant, replayable from any binary log position, and handles inserts, updates, and deletes. The ExtractNewRecordState transform is the key piece that makes Elasticsearch receive clean, flat documents rather than CDC envelopes.
