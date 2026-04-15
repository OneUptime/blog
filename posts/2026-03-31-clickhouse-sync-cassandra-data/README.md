# How to Sync Cassandra Data to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cassandra, Sync, CDC, Data Pipeline, Integration

Description: Sync data from Apache Cassandra to ClickHouse using Cassandra CDC, Debezium, or batch export for analytical workloads.

---

Apache Cassandra is optimized for write-heavy, distributed workloads. Syncing Cassandra data to ClickHouse enables complex analytical queries and aggregations that Cassandra handles poorly due to its limited query capabilities.

## Option 1: Cassandra CDC with Custom Consumer

Enable CDC in Cassandra by setting `cdc_enabled = true` in `cassandra.yaml`:

```yaml
cdc_enabled: true
cdc_raw_directory: /var/lib/cassandra/cdc_raw
```

Enable CDC on a specific table:

```sql
ALTER TABLE myapp.events WITH cdc = true;
```

Write a consumer that polls Cassandra using token-based pagination and inserts into ClickHouse:

```python
import cassandra.cluster
import clickhouse_driver

cluster = cassandra.cluster.Cluster(['cassandra-host'])
session = cluster.connect('myapp')

ch = clickhouse_driver.Client(host='localhost')

# Read from Cassandra
rows = session.execute("SELECT * FROM events WHERE token(event_id) > token(?) LIMIT 10000", [last_token])

buffer = [dict(row._asdict()) for row in rows]
if buffer:
    ch.execute('INSERT INTO events VALUES', buffer)
```

## Option 2: Debezium Cassandra Connector

Use Debezium's Cassandra connector for CDC-based streaming:

```json
{
  "name": "cassandra-connector",
  "config": {
    "cassandra.config": "/etc/cassandra/cassandra.yaml",
    "cassandra.hosts": "cassandra-host",
    "cassandra.port": "9042",
    "commit.log.relocation.dir": "/var/lib/cassandra/cdc_raw",
    "kafka.producer.bootstrap.servers": "kafka:9092",
    "topic.prefix": "cdc"
  }
}
```

Consume the CDC events in ClickHouse via Kafka engine:

```sql
CREATE TABLE cassandra_events_queue (
    event_id String,
    event_type String,
    user_id UInt32,
    event_time DateTime
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'cdc.myapp.events',
    kafka_group_name = 'clickhouse-cassandra',
    kafka_format = 'JSONEachRow';
```

## Option 3: Batch Export with cqlsh

For initial loads or infrequent syncs:

```bash
cqlsh cassandra-host -e "COPY myapp.events TO '/tmp/events.csv' WITH HEADER=TRUE"
clickhouse-client --query="INSERT INTO events FORMAT CSVWithNames" < /tmp/events.csv
```

## Create the ClickHouse Target Table

```sql
CREATE TABLE events (
    event_id String,
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt32
) ENGINE = ReplacingMergeTree()
ORDER BY event_id
PARTITION BY toYYYYMM(event_time);
```

## Handle Cassandra's Eventual Consistency

Cassandra allows conflicting writes. Use `ReplacingMergeTree` in ClickHouse and query with `FINAL` to get the latest version:

```sql
SELECT event_id, event_type, user_id
FROM events
FINAL
WHERE event_time >= today()
LIMIT 100;
```

## Performance Tip

Cassandra supports token-based range scans for parallel export:

```python
token_ranges = [(token_start, token_end) for ... in cassandra_partitioner_ranges]
# Use multiple threads, each reading a token range
```

## Summary

Cassandra data syncs to ClickHouse via Debezium CDC for real-time streaming, custom CDC consumers reading mutation logs, or cqlsh COPY for batch exports. Use `ReplacingMergeTree` to handle Cassandra's eventual consistency model and query with `FINAL` for accurate analytical results.
