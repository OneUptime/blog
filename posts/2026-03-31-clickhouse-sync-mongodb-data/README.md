# How to Sync MongoDB Data to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MongoDB, Sync, CDC, Data Pipeline, Integration

Description: Sync MongoDB collections to ClickHouse for analytics using Change Streams, Debezium CDC, or batch export with the MongoDB connector.

---

MongoDB is a popular document database. Syncing data to ClickHouse enables fast analytical queries on MongoDB collections without impacting MongoDB performance.

## Option 1: MongoDB Change Streams with Custom Consumer

MongoDB Change Streams provide real-time CDC events. Write a Python consumer to forward changes to ClickHouse:

```python
from pymongo import MongoClient
from datetime import datetime
import clickhouse_driver
import json

mongo = MongoClient("mongodb://localhost:27017/")
db = mongo["myapp"]
ch = clickhouse_driver.Client(host='localhost')

# Create ClickHouse target table
ch.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id String,
        user_id String,
        status LowCardinality(String),
        total Decimal(18, 4),
        created_at DateTime,
        _deleted UInt8 DEFAULT 0
    ) ENGINE = ReplacingMergeTree()
    ORDER BY id
""")

buffer = []

with db.orders.watch(full_document='updateLookup') as stream:
    for change in stream:
        op = change['operationType']
        doc = change.get('fullDocument', {})

        if op in ('insert', 'update', 'replace'):
            buffer.append({
                'id': str(doc['_id']),
                'user_id': str(doc.get('user_id', '')),
                'status': doc.get('status', ''),
                'total': float(doc.get('total', 0)),
                'created_at': doc.get('created_at'),
                '_deleted': 0
            })
        elif op == 'delete':
            buffer.append({
                'id': str(change['documentKey']['_id']),
                'user_id': '',
                'status': '',
                'total': 0,
                'created_at': datetime(1970, 1, 1),
                '_deleted': 1
            })

        if len(buffer) >= 500:
            ch.execute('INSERT INTO orders VALUES', buffer)
            buffer = []
```

## Option 2: Debezium MongoDB Connector

For production workloads, use Debezium as the CDC source:

```json
{
  "name": "mongodb-connector",
  "config": {
    "connector.class": "io.debezium.connector.mongodb.MongoDbConnector",
    "mongodb.connection.string": "mongodb://mongo-host:27017/?replicaSet=rs0",
    "topic.prefix": "myapp",
    "collection.include.list": "myapp.orders,myapp.customers",
    "snapshot.mode": "initial"
  }
}
```

Consume the Debezium output in ClickHouse via Kafka engine:

```sql
CREATE TABLE orders_cdc_queue (
    after String,
    op String
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'myapp.myapp.orders',
    kafka_group_name = 'clickhouse-mongo-cdc',
    kafka_format = 'JSONEachRow';
```

## Option 3: Batch Export with mongoexport

For initial loads or periodic syncs:

```bash
mongoexport --host mongo-host --db myapp --collection orders \
  --type json --out orders.jsonl

clickhouse-client --query="INSERT INTO orders FORMAT JSONEachRow" < orders.jsonl
```

## Create the ClickHouse Target Table

```sql
CREATE TABLE orders (
    id String,
    user_id String,
    status LowCardinality(String),
    total Decimal(18, 4),
    created_at DateTime
) ENGINE = ReplacingMergeTree()
ORDER BY id
PARTITION BY toYYYYMM(created_at);
```

## Handle Nested Documents

Flatten nested MongoDB documents during ingestion:

```python
def flatten_doc(doc):
    return {
        'id': str(doc['_id']),
        'user_id': str(doc.get('user', {}).get('id', '')),
        'country': doc.get('user', {}).get('address', {}).get('country', ''),
        'total': float(doc.get('total', 0))
    }
```

## Summary

MongoDB data syncs to ClickHouse via Change Streams for custom consumers, Debezium for production CDC pipelines, or batch export for initial loads. Use `ReplacingMergeTree` in ClickHouse to handle MongoDB updates, flatten nested documents during ingestion, and query with `FINAL` for accurate results.
