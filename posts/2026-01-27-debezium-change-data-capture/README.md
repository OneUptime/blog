# How to Set Up Debezium for Change Data Capture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Debezium, CDC, Kafka, Database, Event Streaming, PostgreSQL, MySQL, Kafka Connect

Description: Learn how to set up Debezium for change data capture to stream database changes to Kafka in real-time for event-driven architectures.

---

> Change Data Capture turns your database into an event stream. Every INSERT, UPDATE, and DELETE becomes a message your systems can react to in real-time.

Traditional polling approaches for syncing data between systems are inefficient and introduce latency. Debezium solves this by reading database transaction logs and streaming changes as events. No polling, no missed changes, no tight coupling.

This guide covers practical Debezium setup with Kafka Connect, including connector configuration for PostgreSQL and MySQL, event message formats, and production best practices.

---

## What is Change Data Capture (CDC)?

Change Data Capture captures row-level changes from database transaction logs. Instead of querying tables for differences, CDC reads the write-ahead log (WAL) or binlog that databases already maintain for crash recovery.

Benefits:

- **Real-time streaming**: Changes available within milliseconds
- **No application changes**: Works at database level
- **Complete history**: Captures all changes, not just current state
- **Low overhead**: Reads logs instead of querying tables
- **Decoupled systems**: Producers and consumers evolve independently

Common use cases:

- Sync data to search indexes (Elasticsearch)
- Populate data warehouses
- Invalidate caches
- Trigger microservice workflows
- Maintain audit logs
- Replicate to read replicas

---

## Debezium Architecture Overview

Debezium runs as a set of Kafka Connect connectors. The architecture has three main components:

```
+-------------+       +------------------+       +-------------+
|  Database   | ----> | Kafka Connect    | ----> |    Kafka    |
| (PostgreSQL |       | (Debezium        |       |   Topics    |
|  or MySQL)  |       |  Connector)      |       |             |
+-------------+       +------------------+       +-------------+
       |                      |                        |
   Transaction            Connector                Events per
      Logs              reads logs               table/topic
```

**Kafka Connect**: Distributed framework for streaming data between Kafka and external systems. Handles scaling, fault tolerance, and offset management.

**Debezium Connector**: Source connector that reads database logs and produces change events to Kafka topics.

**Kafka Topics**: One topic per table by default. Topic naming follows `<server-name>.<schema>.<table>` pattern.

---

## Setting Up Kafka Connect

First, deploy Kafka Connect with Debezium plugins. Here is a Docker Compose setup for development:

```yaml
# docker-compose.yml
# Development setup for Kafka, Zookeeper, and Kafka Connect with Debezium

version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      # Retain messages for 7 days
      KAFKA_LOG_RETENTION_HOURS: 168

  connect:
    image: debezium/connect:2.4
    depends_on:
      - kafka
    ports:
      - "8083:8083"
    environment:
      # Kafka Connect worker configuration
      BOOTSTRAP_SERVERS: kafka:29092
      GROUP_ID: debezium-connect-cluster
      CONFIG_STORAGE_TOPIC: connect_configs
      OFFSET_STORAGE_TOPIC: connect_offsets
      STATUS_STORAGE_TOPIC: connect_statuses
      # Single node development setup
      CONFIG_STORAGE_REPLICATION_FACTOR: 1
      OFFSET_STORAGE_REPLICATION_FACTOR: 1
      STATUS_STORAGE_REPLICATION_FACTOR: 1
      # Connect REST API
      CONNECT_REST_ADVERTISED_HOST_NAME: connect
```

Start the stack:

```bash
docker-compose up -d
```

Verify Kafka Connect is running:

```bash
# Check available connector plugins
curl -s http://localhost:8083/connector-plugins | jq '.[].class'

# Expected output includes:
# "io.debezium.connector.postgresql.PostgresConnector"
# "io.debezium.connector.mysql.MySqlConnector"
```

---

## Configuring the PostgreSQL Connector

PostgreSQL requires logical replication enabled. Configure your PostgreSQL instance:

```sql
-- postgresql.conf settings (or ALTER SYSTEM)
-- Enable logical replication
ALTER SYSTEM SET wal_level = 'logical';
ALTER SYSTEM SET max_replication_slots = 4;
ALTER SYSTEM SET max_wal_senders = 4;

-- Restart PostgreSQL after changes
```

Create a replication user:

```sql
-- Create user with replication privileges
CREATE ROLE debezium WITH REPLICATION LOGIN PASSWORD 'dbz_password';

-- Grant access to the database and schema
GRANT CONNECT ON DATABASE myapp TO debezium;
GRANT USAGE ON SCHEMA public TO debezium;

-- Grant SELECT on tables you want to capture
GRANT SELECT ON ALL TABLES IN SCHEMA public TO debezium;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO debezium;
```

Create the connector:

```bash
# Register PostgreSQL connector via REST API
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "postgres-connector",
    "config": {
      "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
      "database.hostname": "postgres",
      "database.port": "5432",
      "database.user": "debezium",
      "database.password": "dbz_password",
      "database.dbname": "myapp",

      "topic.prefix": "myapp",

      "table.include.list": "public.users,public.orders,public.products",

      "plugin.name": "pgoutput",

      "slot.name": "debezium_slot",

      "publication.name": "dbz_publication",
      "publication.autocreate.mode": "filtered",

      "snapshot.mode": "initial",

      "heartbeat.interval.ms": "10000",

      "tombstones.on.delete": "true",

      "decimal.handling.mode": "string",
      "time.precision.mode": "adaptive_time_microseconds"
    }
  }'
```

Key configuration options explained:

| Option | Purpose |
|--------|---------|
| `topic.prefix` | Prefix for Kafka topics (results in `myapp.public.users`) |
| `table.include.list` | Specific tables to capture (whitelist) |
| `plugin.name` | Logical decoding plugin (`pgoutput` is built-in since PG 10) |
| `slot.name` | Replication slot name for tracking position |
| `snapshot.mode` | `initial` captures existing data first, then streams |
| `heartbeat.interval.ms` | Prevents slot from growing during idle periods |

---

## Configuring the MySQL Connector

MySQL requires binlog enabled in row format. Configure your MySQL instance:

```ini
# my.cnf
[mysqld]
# Enable binary logging
server-id = 1
log_bin = mysql-bin
binlog_format = ROW
binlog_row_image = FULL

# Expire logs after 7 days
expire_logs_days = 7

# Enable GTIDs for better tracking (optional but recommended)
gtid_mode = ON
enforce_gtid_consistency = ON
```

Create a replication user:

```sql
-- Create user with required privileges
CREATE USER 'debezium'@'%' IDENTIFIED BY 'dbz_password';

-- Grant replication privileges
GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'debezium'@'%';

-- For MySQL 8.0+, also grant LOCK TABLES for consistent snapshots
GRANT LOCK TABLES ON myapp.* TO 'debezium'@'%';

FLUSH PRIVILEGES;
```

Create the connector:

```bash
# Register MySQL connector via REST API
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mysql-connector",
    "config": {
      "connector.class": "io.debezium.connector.mysql.MySqlConnector",
      "database.hostname": "mysql",
      "database.port": "3306",
      "database.user": "debezium",
      "database.password": "dbz_password",

      "topic.prefix": "myapp",

      "database.include.list": "myapp",
      "table.include.list": "myapp.users,myapp.orders,myapp.products",

      "database.server.id": "184054",

      "schema.history.internal.kafka.bootstrap.servers": "kafka:29092",
      "schema.history.internal.kafka.topic": "schema-changes.myapp",

      "snapshot.mode": "initial",

      "include.schema.changes": "true",

      "decimal.handling.mode": "string",
      "time.precision.mode": "adaptive_time_microseconds",

      "tombstones.on.delete": "true"
    }
  }'
```

MySQL-specific options:

| Option | Purpose |
|--------|---------|
| `database.server.id` | Unique ID for this connector (must not conflict with other replicas) |
| `schema.history.internal.kafka.topic` | Stores DDL history for schema evolution |
| `include.schema.changes` | Emit DDL changes to a separate topic |

---

## Understanding Event Message Format

Debezium produces structured JSON messages with metadata. Here is an example change event:

```json
{
  "schema": { ... },
  "payload": {
    "before": {
      "id": 1001,
      "email": "alice@example.com",
      "status": "pending"
    },
    "after": {
      "id": 1001,
      "email": "alice@example.com",
      "status": "active"
    },
    "source": {
      "version": "2.4.0.Final",
      "connector": "postgresql",
      "name": "myapp",
      "ts_ms": 1706284800000,
      "snapshot": "false",
      "db": "myapp",
      "schema": "public",
      "table": "users",
      "txId": 12345,
      "lsn": 98765432
    },
    "op": "u",
    "ts_ms": 1706284800123,
    "transaction": null
  }
}
```

Message fields explained:

| Field | Description |
|-------|-------------|
| `before` | Row state before the change (null for INSERT) |
| `after` | Row state after the change (null for DELETE) |
| `op` | Operation type: `c` (create), `u` (update), `d` (delete), `r` (read/snapshot) |
| `source.ts_ms` | Timestamp when change occurred in database |
| `source.lsn` | Log sequence number (PostgreSQL) or binlog position (MySQL) |
| `ts_ms` | Timestamp when Debezium processed the event |

Operation types:

- `c` - CREATE (INSERT)
- `u` - UPDATE
- `d` - DELETE
- `r` - READ (initial snapshot)
- `t` - TRUNCATE

---

## Handling Schema Changes

Schema changes are inevitable. Debezium handles them differently per database:

**PostgreSQL**: Schema changes are captured automatically. The connector reads the current schema on startup and tracks changes via the replication stream.

**MySQL**: DDL statements are stored in the schema history topic. The connector replays this history on restart to reconstruct the schema at any point.

Configure schema change handling:

```json
{
  "config": {
    "include.schema.changes": "true",

    "schema.history.internal.kafka.topic": "schema-changes.myapp",
    "schema.history.internal.kafka.bootstrap.servers": "kafka:29092",

    "schema.history.internal.store.only.captured.tables.ddl": "true"
  }
}
```

Schema compatibility settings for consumers:

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

Using Avro with Schema Registry provides:

- Schema evolution validation
- Backward/forward compatibility checks
- Compact binary format
- Schema versioning

---

## Monitoring Connectors

Monitor connector health via the Kafka Connect REST API:

```bash
# List all connectors
curl -s http://localhost:8083/connectors | jq

# Get connector status
curl -s http://localhost:8083/connectors/postgres-connector/status | jq

# Example healthy response
{
  "name": "postgres-connector",
  "connector": {
    "state": "RUNNING",
    "worker_id": "connect:8083"
  },
  "tasks": [
    {
      "id": 0,
      "state": "RUNNING",
      "worker_id": "connect:8083"
    }
  ],
  "type": "source"
}
```

Key metrics to monitor:

```bash
# Get connector metrics via JMX or REST
# Lag: difference between database position and connector position
# Throughput: events per second
# Error count: failed records

# Check connector configuration
curl -s http://localhost:8083/connectors/postgres-connector/config | jq

# Restart a failed task
curl -X POST http://localhost:8083/connectors/postgres-connector/tasks/0/restart
```

Set up alerts for:

- Connector state not RUNNING
- Task state FAILED
- Replication slot lag growing (PostgreSQL)
- Binlog position lag (MySQL)
- Consumer group lag on CDC topics

Prometheus metrics example with JMX exporter:

```yaml
# prometheus-jmx-config.yml
rules:
  # Debezium metrics
  - pattern: "debezium.([^:]+)<type=connector-metrics, context=([^,]+), server=([^,]+)><>([^:]+)"
    name: "debezium_connector_$4"
    labels:
      connector: "$1"
      context: "$2"
      server: "$3"

  # Track streaming lag
  - pattern: "debezium.([^:]+)<type=connector-metrics, context=streaming, server=([^,]+)><>MilliSecondsBehindSource"
    name: "debezium_streaming_lag_ms"
    labels:
      connector: "$1"
      server: "$2"
```

---

## Use Cases and Patterns

### Pattern 1: Search Index Sync

Stream changes to Elasticsearch for full-text search:

```python
# Kafka consumer updating Elasticsearch
from kafka import KafkaConsumer
from elasticsearch import Elasticsearch
import json

consumer = KafkaConsumer(
    'myapp.public.products',
    bootstrap_servers=['localhost:9092'],
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    group_id='elasticsearch-sync',
    auto_offset_reset='earliest'
)

es = Elasticsearch(['http://localhost:9200'])

for message in consumer:
    payload = message.value['payload']
    op = payload['op']

    if op in ('c', 'u', 'r'):  # Create, Update, or Snapshot read
        # Index the document
        doc = payload['after']
        es.index(index='products', id=doc['id'], document=doc)
    elif op == 'd':  # Delete
        # Remove from index
        doc_id = payload['before']['id']
        es.delete(index='products', id=doc_id, ignore=[404])
```

### Pattern 2: Cache Invalidation

Invalidate Redis cache on database changes:

```python
# Invalidate cache entries when source data changes
import redis

redis_client = redis.Redis(host='localhost', port=6379)

for message in consumer:
    payload = message.value['payload']
    table = payload['source']['table']

    if payload['op'] in ('u', 'd'):
        # Get the ID from before or after
        record = payload.get('before') or payload.get('after')
        cache_key = f"{table}:{record['id']}"
        redis_client.delete(cache_key)
```

### Pattern 3: Event-Driven Microservices

Trigger downstream services based on data changes:

```python
# Order service reacting to payment status changes
for message in consumer:
    payload = message.value['payload']

    if payload['op'] == 'u':
        before = payload['before']
        after = payload['after']

        # Detect status transition
        if before['status'] != after['status']:
            if after['status'] == 'paid':
                # Trigger fulfillment workflow
                trigger_order_fulfillment(after['order_id'])
            elif after['status'] == 'refunded':
                # Trigger refund notification
                send_refund_notification(after['order_id'])
```

### Pattern 4: Audit Log

Maintain immutable audit trail:

```python
# Store all changes as audit events
for message in consumer:
    payload = message.value['payload']

    audit_event = {
        'timestamp': payload['ts_ms'],
        'table': payload['source']['table'],
        'operation': payload['op'],
        'before': payload.get('before'),
        'after': payload.get('after'),
        'transaction_id': payload['source'].get('txId'),
        'user_id': extract_user_from_context()  # If available
    }

    # Write to immutable audit store
    write_to_audit_log(audit_event)
```

---

## Best Practices Summary

**Database Configuration**

- Use dedicated replication user with minimal privileges
- Monitor replication slot/binlog growth
- Set appropriate WAL retention or binlog expiration
- Test failover scenarios with replicas

**Connector Configuration**

- Start with `snapshot.mode: initial` for existing data
- Use `table.include.list` to capture only needed tables
- Enable heartbeats to prevent slot growth during idle periods
- Set `tombstones.on.delete: true` for log compacted topics

**Message Handling**

- Design consumers to be idempotent (handle replays)
- Use `source.lsn` or `source.txId` for deduplication
- Handle all operation types (`c`, `u`, `d`, `r`)
- Process `before` and `after` for update detection

**Operations**

- Monitor connector status and lag metrics
- Set up alerts for FAILED state
- Back up schema history topic (MySQL)
- Test connector restarts and recovery
- Document your CDC topology

**Scaling**

- One connector task per table (PostgreSQL) or database (MySQL)
- Partition Kafka topics for parallel consumption
- Use separate connector instances for different databases
- Consider Debezium Server for non-Kafka targets

---

## Conclusion

Debezium transforms your database into a real-time event stream without application changes. By reading transaction logs, it captures every change with low latency and minimal overhead.

Key takeaways:

- CDC eliminates polling and ensures no missed changes
- Kafka Connect handles distribution and fault tolerance
- Schema handling differs between PostgreSQL and MySQL
- Design consumers for idempotency and all operation types
- Monitor connector health and replication lag

Start with a single table, verify events flow correctly, then expand. The investment in CDC infrastructure pays off across search sync, caching, microservices, and audit requirements.

For monitoring your CDC pipelines and downstream services, [OneUptime](https://oneuptime.com) provides unified observability across your event-driven architecture.
