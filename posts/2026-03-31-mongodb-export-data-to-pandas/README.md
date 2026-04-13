# How to Export MongoDB Data to Pandas DataFrames

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Python, Pandas, Export, DataFrame

Description: Learn multiple techniques to export MongoDB collection data to Pandas DataFrames efficiently, handling nested documents and large datasets correctly.

---

## Overview

Exporting MongoDB data to Pandas DataFrames is a common step in data analysis and machine learning pipelines. This guide covers multiple export techniques - from basic `find()` calls to aggregation-based exports and chunked loading for large collections.

## Basic Export

```python
import pandas as pd
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
col = client["shop"]["orders"]

# Export all documents (excluding _id)
df = pd.DataFrame(list(col.find({}, {"_id": 0})))
print(df.shape)
print(df.head())
```

## Exporting with Field Selection

Use projections to export only the fields you need:

```python
projection = {
    "_id":        0,
    "orderId":    1,
    "customerId": 1,
    "amount":     1,
    "status":     1,
    "createdAt":  1
}

df = pd.DataFrame(list(col.find({"status": "completed"}, projection)))
df["createdAt"] = pd.to_datetime(df["createdAt"])
print(df.dtypes)
```

## Exporting Aggregation Results

Push computation to MongoDB and export the result:

```python
pipeline = [
    {"$match": {"status": "completed"}},
    {
        "$group": {
            "_id":   "$category",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }
    },
    {"$sort": {"total": -1}}
]

df = pd.DataFrame(list(col.aggregate(pipeline)))
df = df.rename(columns={"_id": "category"})
print(df)
```

## Flattening Nested Documents

MongoDB documents can have nested fields. Use `pd.json_normalize` to flatten them:

```python
docs = list(col.find({}, {"_id": 0, "customer": 1, "amount": 1}))
df = pd.json_normalize(docs, sep="_")
# customer.name becomes customer_name, customer.email becomes customer_email
print(df.columns.tolist())
```

## Chunked Export for Large Collections

For very large collections, export in chunks to avoid memory exhaustion:

```python
def export_chunked(collection, filter_query, chunk_size=10000):
    chunks = []
    cursor = collection.find(filter_query, {"_id": 0}).batch_size(chunk_size)
    chunk = []
    for doc in cursor:
        chunk.append(doc)
        if len(chunk) >= chunk_size:
            chunks.append(pd.DataFrame(chunk))
            chunk = []
    if chunk:
        chunks.append(pd.DataFrame(chunk))
    return pd.concat(chunks, ignore_index=True) if chunks else pd.DataFrame()

df = export_chunked(col, {"status": "completed"})
print(f"Exported {len(df)} rows")
```

## Exporting to CSV after Loading

```python
df = pd.DataFrame(list(col.find({}, {"_id": 0})))
df.to_csv("orders_export.csv", index=False)
print("Exported to CSV")
```

## Converting ObjectId to String

```python
docs = list(col.find({}))  # includes _id
df = pd.DataFrame(docs)
df["_id"] = df["_id"].astype(str)
df["customerId"] = df["customerId"].astype(str)
```

## Using PyMongoArrow for High Performance

```bash
pip install pymongoarrow
```

```python
from pymongoarrow.monkey import patch_all
import pyarrow as pa
patch_all()

schema = pa.schema([
    ("amount", pa.float64()),
    ("status", pa.string())
])

df = col.find_pandas_all({"status": "completed"}, schema=schema)
print(df.memory_usage(deep=True))
```

## Summary

Export MongoDB data to Pandas with `pd.DataFrame(list(col.find()))` for small collections and chunked cursors for large ones. Use MongoDB aggregation pipelines to reduce data volume before loading. Flatten nested documents with `pd.json_normalize`. For high-performance exports, use `pymongoarrow` to load directly into Arrow-backed DataFrames with defined schemas.
