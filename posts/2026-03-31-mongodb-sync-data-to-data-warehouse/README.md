# How to Sync MongoDB Data to a Data Warehouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Warehouse, ETL, Analytics, BigQuery

Description: Learn the patterns and tools for syncing MongoDB collections to a data warehouse for analytics, including change data capture and ETL pipelines.

---

## Why Sync MongoDB to a Data Warehouse?

MongoDB is optimized for operational workloads: flexible writes, low-latency reads, and rich document queries. Data warehouses like BigQuery, Snowflake, and Redshift are optimized for analytical queries across large datasets. Syncing MongoDB to a warehouse lets you run complex aggregations, joins with other data sources, and BI dashboards without impacting your operational database.

## Synchronization Strategies

Three main strategies exist:

1. **Full refresh** - export the entire collection on each sync
2. **Incremental** - sync only documents changed since the last run
3. **CDC (Change Data Capture)** - stream all inserts, updates, and deletes in near-real-time

## Full Refresh Export

For small collections or when simplicity is preferred:

```bash
mongoexport \
  --uri "mongodb+srv://user:pass@cluster.mongodb.net/" \
  --db myDatabase \
  --collection products \
  --out products.json
```

Then load into BigQuery:

```bash
bq load \
  --source_format=NEWLINE_DELIMITED_JSON \
  --autodetect \
  myproject.analytics.products \
  products.json
```

## Incremental Sync with a Timestamp Cursor

For large collections, use a timestamp field to sync only new or modified records:

```python
from pymongo import MongoClient
from google.cloud import bigquery
from datetime import datetime, timezone

LAST_SYNC = datetime(2026, 3, 30, tzinfo=timezone.utc)

client = MongoClient("mongodb+srv://user:pass@cluster.mongodb.net/")
bq_client = bigquery.Client()

docs = list(client.myDatabase.orders.find(
    {"updatedAt": {"$gt": LAST_SYNC}},
    {"_id": 0}
))

if docs:
    errors = bq_client.insert_rows_json("myproject.analytics.orders", docs)
    print(f"Synced {len(docs)} rows, errors: {errors}")
```

## CDC with MongoDB Change Streams

Change streams provide a real-time stream of all write operations. Open a change stream on a collection to capture every event:

```python
from pymongo import MongoClient
import json

client = MongoClient("mongodb+srv://user:pass@cluster.mongodb.net/")
collection = client.myDatabase.orders

with collection.watch(full_document="updateLookup") as stream:
    for change in stream:
        operation = change["operationType"]
        doc = change.get("fullDocument", {})

        if operation in ("insert", "update", "replace"):
            # Upsert into warehouse
            print(f"Upsert: {json.dumps(doc, default=str)}")
        elif operation == "delete":
            doc_id = change["documentKey"]["_id"]
            print(f"Delete: {doc_id}")
```

## Resuming Change Streams After Restart

Change streams can be resumed using a resume token:

```python
# Save resume token after each event
resume_token = None

with collection.watch(resume_after=resume_token) as stream:
    for change in stream:
        resume_token = change["_id"]
        process_change(change)
        save_token_to_storage(resume_token)
```

## Document Flattening for Warehouse Tables

MongoDB's nested documents need to be flattened for warehouse tables:

```python
def flatten_document(doc, prefix="", sep="__"):
    flat = {}
    for key, value in doc.items():
        full_key = f"{prefix}{sep}{key}" if prefix else key
        if isinstance(value, dict):
            flat.update(flatten_document(value, full_key, sep))
        elif isinstance(value, list):
            flat[full_key] = json.dumps(value)
        else:
            flat[full_key] = value
    return flat
```

## Using a Managed ELT Tool

For production use, managed tools handle retries, schema migration, and monitoring automatically:

| Tool | Approach | Latency |
| --- | --- | --- |
| Fivetran | CDC via oplog | Minutes |
| Airbyte | Incremental or CDC | Minutes |
| Stitch | Log-based CDC | Minutes |
| dbt | Transformation only | N/A |

## Handling _id and ObjectId

MongoDB `_id` fields are ObjectIds, not strings. When loading to a warehouse, convert them:

```python
from bson import ObjectId

def serialize_doc(doc):
    return {
        k: str(v) if isinstance(v, ObjectId) else v
        for k, v in doc.items()
    }
```

## Summary

Syncing MongoDB to a data warehouse requires choosing the right strategy based on collection size, latency requirements, and complexity. Use full refresh for small collections, incremental cursor-based sync for medium collections, and CDC via change streams for real-time requirements. Flatten nested documents during extraction, handle ObjectId serialization, and use managed ELT tools like Fivetran or Airbyte for production-grade pipelines.
