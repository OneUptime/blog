# How to Export MongoDB Data to Parquet Format

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Export, Parquet, Python, Data Engineering

Description: Learn how to export MongoDB collection data to Apache Parquet format using Python with pymongo and pyarrow for efficient analytical storage and processing.

---

Apache Parquet is a columnar storage format optimized for analytical workloads. Exporting MongoDB data to Parquet enables efficient querying in data lake environments, reduces storage costs through compression, and integrates with tools like Apache Spark, DuckDB, and AWS Athena.

## Prerequisites

```bash
pip install pymongo pyarrow pandas
```

## Basic MongoDB to Parquet Export

The simplest approach reads all documents, flattens them into a Pandas DataFrame, and writes Parquet:

```python
import pymongo
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

def export_to_parquet(collection_name, output_file, query=None, projection=None):
    client = pymongo.MongoClient("mongodb://localhost:27017")
    db = client["myapp"]
    collection = db[collection_name]

    cursor = collection.find(query or {}, projection or {})
    documents = list(cursor)
    client.close()

    if not documents:
        print("No documents found")
        return

    # Convert ObjectId and dates to strings
    for doc in documents:
        doc["_id"] = str(doc["_id"])

    df = pd.DataFrame(documents)
    df.to_parquet(output_file, index=False, compression="snappy")
    print(f"Exported {len(documents)} documents to {output_file}")

export_to_parquet("products", "products.parquet")
```

## Streaming Export for Large Collections

For large collections, use batched cursor iteration to avoid loading everything into memory:

```python
import pymongo
import pyarrow as pa
import pyarrow.parquet as pq
from bson import ObjectId
from datetime import datetime

def stream_export_to_parquet(collection_name, output_file, batch_size=10000):
    client = pymongo.MongoClient("mongodb://localhost:27017")
    collection = client["myapp"][collection_name]

    writer = None
    batch_num = 0
    total_rows = 0

    cursor = collection.find({}).batch_size(batch_size)

    batch = []
    for doc in cursor:
        # Normalize types
        doc["_id"] = str(doc["_id"])
        for key, val in doc.items():
            if isinstance(val, datetime):
                doc[key] = val.isoformat()
            elif isinstance(val, ObjectId):
                doc[key] = str(val)
        batch.append(doc)

        if len(batch) >= batch_size:
            table = pa.Table.from_pylist(batch)
            if writer is None:
                writer = pq.ParquetWriter(output_file, table.schema, compression="snappy")
            writer.write_table(table)
            total_rows += len(batch)
            batch_num += 1
            print(f"Wrote batch {batch_num} ({total_rows} rows total)")
            batch = []

    # Write final batch
    if batch:
        table = pa.Table.from_pylist(batch)
        if writer is None:
            writer = pq.ParquetWriter(output_file, table.schema, compression="snappy")
        writer.write_table(table)
        total_rows += len(batch)

    if writer:
        writer.close()

    client.close()
    print(f"Export complete: {total_rows} documents written to {output_file}")
```

## Defining an Explicit Schema

For precise type control, define a PyArrow schema explicitly:

```python
schema = pa.schema([
    pa.field("_id", pa.string()),
    pa.field("name", pa.string()),
    pa.field("price", pa.float64()),
    pa.field("in_stock", pa.bool_()),
    pa.field("created_at", pa.timestamp("ms")),
])

table = pa.Table.from_pylist(documents, schema=schema)
pq.write_table(table, "products.parquet", compression="snappy")
```

## Partitioned Parquet Export

For very large datasets, write partitioned Parquet files organized by a field value:

```python
import pyarrow.dataset as ds

df = pd.DataFrame(documents)
df["_id"] = df["_id"].astype(str)
table = pa.Table.from_pandas(df)

ds.write_dataset(
    table,
    base_dir="output/products",
    format="parquet",
    partitioning=ds.partitioning(pa.schema([pa.field("category", pa.string())])),
    existing_data_behavior="overwrite_or_ignore"
)
```

This creates a directory structure like `output/products/category=Electronics/part-0.parquet`.

## Reading the Parquet File

Verify the export by reading it back:

```python
import pandas as pd

df = pd.read_parquet("products.parquet")
print(df.shape)
print(df.dtypes)
print(df.head())
```

## Summary

Exporting MongoDB data to Parquet involves reading documents from MongoDB with pymongo, normalizing MongoDB-specific types like ObjectId and datetime, and writing columnar Parquet files with pyarrow. For large collections, stream the export in batches using `ParquetWriter` to avoid memory exhaustion. Parquet's columnar storage and built-in compression make it ideal for analytical workloads where you query a subset of columns from millions of rows.
