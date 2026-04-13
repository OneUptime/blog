# How to Import a Large JSON File into MongoDB Efficiently

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoimport, Data Import, JSON, Performance

Description: Learn how to efficiently import large JSON files into MongoDB using mongoimport, batch size tuning, and streaming techniques to handle millions of records.

---

## Introduction

Importing large JSON files into MongoDB requires more than a simple `mongoimport` call. Files with millions of records need careful handling to avoid memory exhaustion, long import times, and dropped connections. This guide covers `mongoimport` options, batch tuning, and scripted streaming approaches for reliable large-scale imports.

## Basic mongoimport Command

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection orders \
  --file orders.json \
  --jsonArray
```

The `--jsonArray` flag tells mongoimport the file contains a JSON array at the top level.

## JSON Lines Format (Preferred for Large Files)

For large files, use JSON Lines format (one JSON object per line, no array wrapper). This allows streaming without loading the entire file:

```bash
# JSON Lines file - one document per line
{"_id": 1, "name": "Alice", "amount": 100}
{"_id": 2, "name": "Bob", "amount": 200}
{"_id": 3, "name": "Charlie", "amount": 300}
```

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection customers \
  --file customers.jsonl \
  --type json
```

No `--jsonArray` flag needed for JSON Lines.

## Tuning numInsertionWorkers and batchSize

For large imports, increase parallelism and batch size:

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --file products.jsonl \
  --numInsertionWorkers 8 \
  --batchSize 1000
```

```text
numInsertionWorkers - Parallel insertion goroutines (default: 1)
batchSize           - Documents per batch (default: 1000)
```

Tune based on:

```text
- numInsertionWorkers: Set to number of CPU cores on the MongoDB server
- batchSize: 500-2000 works well; higher may cause memory pressure
```

## Converting Large JSON Array to JSON Lines

If you have a large JSON array file, convert it to JSON Lines first:

```bash
# Using jq to convert JSON array to JSON Lines
jq -c '.[]' large_array.json > output.jsonl
```

For very large files that do not fit in memory, use a streaming JSON parser like `ijson`:

```bash
# Install ijson for streaming JSON parsing
pip install ijson

# Stream-convert JSON array to JSON Lines without loading the entire file
python3 -c "
import ijson, json
with open('large_array.json', 'rb') as f:
    for obj in ijson.items(f, 'item'):
        print(json.dumps(obj))
" > output.jsonl
```

## Streaming Import with Python (pymongo)

For programmatic control over large imports:

```python
import json
from pymongo import MongoClient, InsertOne
from pymongo.errors import BulkWriteError

client = MongoClient("mongodb://localhost:27017/")
db = client["mydb"]
collection = db["orders"]

BATCH_SIZE = 1000
batch = []

with open("orders.jsonl", "r") as f:
    for line_num, line in enumerate(f, 1):
        line = line.strip()
        if not line:
            continue

        doc = json.loads(line)
        batch.append(InsertOne(doc))

        if len(batch) >= BATCH_SIZE:
            try:
                collection.bulk_write(batch, ordered=False)
                print(f"Inserted {line_num} documents...")
            except BulkWriteError as e:
                print(f"Bulk write error: {e.details}")
            batch = []

    if batch:
        collection.bulk_write(batch, ordered=False)

print("Import complete")
```

## Drop Indexes Before Import

For large initial imports, drop secondary indexes first and recreate after:

```javascript
// Before import - note existing indexes
db.orders.getIndexes();

// Drop non-essential indexes
db.orders.dropIndex("status_1_createdAt_1");

// ... run import ...

// After import - recreate indexes
db.orders.createIndex({ status: 1, createdAt: -1 });
```

## Using mongoimport with Authentication

```bash
mongoimport \
  --uri "mongodb+srv://username:password@cluster.mongodb.net/mydb" \
  --collection users \
  --file users.jsonl \
  --authenticationDatabase admin \
  --numInsertionWorkers 4
```

## Monitoring Import Progress

Check import progress in real time:

```bash
# In another terminal while import runs
watch -n 2 "mongosh --quiet --eval 'db.orders.countDocuments()' mydb"
```

Or check server throughput:

```bash
mongostat --uri "mongodb://localhost:27017" 1
```

## Handling Duplicate _id Errors

Use `--stopOnError` or `--upsertFields` to control behavior on duplicate keys:

```bash
# Skip duplicates and continue
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection orders \
  --file orders.jsonl \
  --mode upsert \
  --upsertFields "_id"
```

## Summary

For large JSON imports to MongoDB, use JSON Lines format over JSON array files to enable streaming and avoid memory issues. Tune `numInsertionWorkers` and `batchSize` in mongoimport for throughput, drop secondary indexes before bulk imports, and use Python with `bulk_write` for programmatic control. Always monitor progress via `countDocuments()` and recreate indexes after the import completes.
