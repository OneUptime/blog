# How to Use ETL Pipelines to Load Data into MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, ETL, Python, Data Pipeline, Data Engineering

Description: Learn how to build ETL pipelines that extract data from source systems, transform it, and load it into MongoDB using Python with batching and error handling.

---

ETL (Extract, Transform, Load) pipelines are the backbone of data integration workflows. When MongoDB is the target, the pipeline reads data from source systems, applies transformations, and bulk-inserts the results. A well-structured ETL pipeline handles errors gracefully, processes data in batches, and provides progress visibility.

## ETL Pipeline Architecture

A minimal MongoDB ETL pipeline has three phases:

```text
Extract -> Transform -> Load
  |            |           |
Source DB   Clean/Map   MongoDB
CSV File    Validate    bulk_write()
REST API    Enrich
```

## Extracting from a PostgreSQL Source

```python
import psycopg2
import pandas as pd

def extract_from_postgres(query, conn_string):
    conn = psycopg2.connect(conn_string)
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df

df = extract_from_postgres(
    "SELECT id, name, email, created_at, status FROM customers WHERE status = 'active'",
    "postgresql://user:pass@localhost:5432/sourcedb"
)
```

## Transformation Phase

```python
import pandas as pd
from datetime import datetime

def transform_customers(df):
    docs = []
    for _, row in df.iterrows():
        doc = {
            "externalId": int(row["id"]),
            "name": str(row["name"]).strip(),
            "email": str(row["email"]).lower().strip(),
            "status": str(row["status"]),
            "createdAt": row["created_at"].to_pydatetime() if pd.notna(row["created_at"]) else None,
            "importedAt": datetime.utcnow(),
            "source": "postgres_migration"
        }
        docs.append(doc)
    return docs
```

## Loading Phase with Upsert

Use `update_one` with `upsert=True` to avoid duplicate inserts on re-runs:

```python
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError

def load_to_mongodb(documents, collection, batch_size=1000, id_field="externalId"):
    total_upserted = 0
    total_modified = 0
    errors = 0

    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        operations = [
            UpdateOne(
                {id_field: doc[id_field]},
                {"$set": doc},
                upsert=True
            )
            for doc in batch
        ]
        try:
            result = collection.bulk_write(operations, ordered=False)
            total_upserted += result.upserted_count
            total_modified += result.modified_count
        except BulkWriteError as e:
            errors += len(e.details.get("writeErrors", []))
            total_upserted += e.details.get("nUpserted", 0)
            total_modified += e.details.get("nModified", 0)
            print(f"Batch error: {errors} write errors")

        print(f"Progress: {min(i + batch_size, len(documents))}/{len(documents)}")

    print(f"Upserted: {total_upserted}, Modified: {total_modified}, Errors: {errors}")
```

## Complete ETL Runner

Wire the three phases together:

```python
from pymongo import MongoClient

def run_etl():
    # Extract
    print("Extracting from source...")
    df = extract_from_postgres(
        "SELECT * FROM customers",
        "postgresql://user:pass@localhost/sourcedb"
    )
    print(f"Extracted {len(df)} records")

    # Transform
    print("Transforming data...")
    documents = transform_customers(df)
    print(f"Transformed {len(documents)} documents")

    # Load
    print("Loading into MongoDB...")
    client = MongoClient("mongodb://localhost:27017")
    collection = client["myapp"]["customers"]
    collection.create_index("externalId", unique=True)
    load_to_mongodb(documents, collection)
    client.close()
    print("ETL complete")

if __name__ == "__main__":
    run_etl()
```

## Incremental ETL with Watermarks

For ongoing sync, track the last processed timestamp:

```python
def get_watermark(db):
    state = db["etl_state"].find_one({"pipeline": "customers"})
    return state["last_run"] if state else datetime(2000, 1, 1)

def update_watermark(db, timestamp):
    db["etl_state"].update_one(
        {"pipeline": "customers"},
        {"$set": {"last_run": timestamp}},
        upsert=True
    )

# Extract only new/changed records
last_run = get_watermark(db)
df = extract_from_postgres(
    f"SELECT * FROM customers WHERE updated_at > '{last_run}'",
    conn_string
)
```

## Summary

A MongoDB ETL pipeline extracts records from source systems, applies transformation logic to produce clean MongoDB documents, and bulk-loads them using `bulk_write` with upsert operations. Using upserts instead of plain inserts makes the pipeline idempotent - safe to re-run without duplicating data. Watermark-based incremental extraction minimizes data transfer on subsequent runs, while batch processing with error handling ensures large loads complete reliably even when individual records fail.
