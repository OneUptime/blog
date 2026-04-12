# How to Import Pandas DataFrames into MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Python, Pandas, Import, DataFrame

Description: Learn how to import Pandas DataFrames into MongoDB collections efficiently using insert_many, bulk_write, and upsert patterns for large datasets.

---

## Overview

Importing Pandas DataFrames into MongoDB is a common ETL pattern - transforming data with Pandas and persisting results to MongoDB for serving or further processing. The key is converting DataFrame rows to Python dicts and choosing the right write strategy for your use case.

## Basic Import with insert_many

```python
import pandas as pd
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
col = client["shop"]["products"]

# Load data from CSV
df = pd.read_csv("products.csv")

# Convert DataFrame to list of dicts and insert
records = df.to_dict("records")
result = col.insert_many(records)
print(f"Inserted {len(result.inserted_ids)} documents")
```

## Handling NaN Values

MongoDB accepts `NaN` as a valid BSON double, but NaN values cause unexpected behavior in queries and comparisons. Replace NaN with `None` before importing:

```python
# Replace NaN with None (MongoDB null)
df = df.where(pd.notnull(df), None)

# Or drop rows with NaN in critical columns
df = df.dropna(subset=["name", "price"])

records = df.to_dict("records")
```

## Chunked Import for Large DataFrames

For DataFrames with millions of rows, insert in chunks:

```python
def insert_in_chunks(collection, dataframe, chunk_size=1000):
    total = 0
    for i in range(0, len(dataframe), chunk_size):
        chunk = dataframe.iloc[i:i + chunk_size]
        records = chunk.where(pd.notnull(chunk), None).to_dict("records")
        if records:
            collection.insert_many(records, ordered=False)
            total += len(records)
    return total

df = pd.read_csv("large_dataset.csv")
count = insert_in_chunks(col, df, chunk_size=5000)
print(f"Inserted {count} total records")
```

## Upsert Pattern (Update or Insert)

Use bulk_write with upsert for idempotent imports:

```python
from pymongo import UpdateOne

def upsert_dataframe(collection, df, key_field):
    ops = []
    for record in df.where(pd.notnull(df), None).to_dict("records"):
        filter_doc = {key_field: record[key_field]}
        ops.append(UpdateOne(filter_doc, {"$set": record}, upsert=True))

    if ops:
        result = collection.bulk_write(ops, ordered=False)
        print(f"Upserted: {result.upserted_count}, Modified: {result.modified_count}")

upsert_dataframe(col, df, key_field="sku")
```

## Type Conversion Before Import

```python
from datetime import datetime

# Convert Pandas Timestamp to Python datetime
df["createdAt"] = pd.to_datetime(df["createdAt"]).dt.to_pydatetime()

# Convert int64 to int (MongoDB requires native Python types)
df["quantity"] = df["quantity"].astype(int)

# Convert float64 to float
df["price"] = df["price"].astype(float)
```

## Importing with Custom _id

Assign a meaningful `_id` to avoid duplicate documents on re-import:

```python
df["_id"] = df["sku"]  # use SKU as natural key
records = df.to_dict("records")

try:
    col.insert_many(records, ordered=False)
except Exception as e:
    print("Some records skipped (duplicates):", e)
```

## Verifying the Import

```python
print("Documents in collection:", col.count_documents({}))
sample = col.find_one()
print("Sample document:", sample)
```

## Summary

Import Pandas DataFrames into MongoDB by converting rows with `df.to_dict("records")` and calling `insert_many`. Always replace `NaN` with `None` before import. Use chunked inserts for large datasets and `bulk_write` with `UpdateOne(upsert=True)` for idempotent imports. Convert Pandas types (`Timestamp`, `int64`, `float64`) to Python native types before inserting to avoid serialization errors.
