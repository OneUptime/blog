# How to Bulk Load Data into MongoDB Efficiently

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Bulk Insert, Performance, Import, Data Engineering

Description: Learn how to bulk load large datasets into MongoDB efficiently using insert_many, mongoimport, and tuning write concern, batch size, and indexing strategies.

---

Loading millions of documents into MongoDB efficiently requires choosing the right insertion method, tuning batch sizes, deferring index builds, and adjusting write concern. The difference between naive single-document inserts and a well-tuned bulk load can be orders of magnitude in throughput.

## Method 1: insert_many with pymongo

`insert_many` is the fastest Python insertion method:

```python
from pymongo import MongoClient
from pymongo.errors import BulkWriteError

client = MongoClient(
    "mongodb://localhost:27017",
    w=1,                    # acknowledge after primary only
    j=False,               # skip journal write (faster, less durable)
)
collection = client["myapp"]["events"]

def bulk_insert(documents, batch_size=5000):
    total = 0
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        try:
            result = collection.insert_many(batch, ordered=False)
            total += len(result.inserted_ids)
        except BulkWriteError as e:
            total += e.details.get("nInserted", 0)
        if i % 50000 == 0:
            print(f"Inserted {total} documents")
    return total
```

Using `ordered=False` allows MongoDB to parallelize the batch and continue on errors.

## Method 2: mongoimport for JSON/CSV Files

For flat files, `mongoimport` is the fastest option - it bypasses the driver entirely:

```bash
# Import JSON array file
mongoimport \
  --uri="mongodb://localhost:27017/myapp" \
  --collection=events \
  --file=events.json \
  --jsonArray \
  --numInsertionWorkers=4 \
  --batchSize=1000

# Import NDJSON (newline-delimited JSON)
mongoimport \
  --uri="mongodb://localhost:27017/myapp" \
  --collection=events \
  --file=events.ndjson \
  --numInsertionWorkers=4
```

The `--numInsertionWorkers` flag parallelizes the insert across multiple threads.

## Defer Index Builds Until After Load

Indexes slow down write throughput significantly. Drop non-essential indexes before loading, then rebuild:

```javascript
// Before bulk load - drop secondary indexes
db.events.dropIndex("timestamp_1")
db.events.dropIndex("userId_1_timestamp_1")

// After bulk load - rebuild indexes
db.events.createIndex({ "timestamp": 1 })
db.events.createIndex({ "userId": 1, "timestamp": 1 })
```

## Tuning Write Concern for Speed

During bulk loading, you may prefer throughput over maximum durability:

```python
from pymongo import MongoClient

# Fastest: no acknowledgment (fire and forget)
fast_client = MongoClient("mongodb://localhost:27017", w=0)

# Balanced: primary acknowledged, no journal
balanced_client = MongoClient("mongodb://localhost:27017", w=1, j=False)

# Default: primary acknowledged with journal
safe_client = MongoClient("mongodb://localhost:27017", w=1, j=True)
```

Switch back to `w=1, j=True` after the bulk load for production writes.

## Generating Test Data and Loading

```python
import random
import uuid
from datetime import datetime, timedelta

def generate_events(count):
    base_time = datetime(2024, 1, 1)
    event_types = ["click", "view", "purchase", "signup"]
    documents = []
    for i in range(count):
        documents.append({
            "eventId": str(uuid.uuid4()),
            "userId": f"user_{random.randint(1, 10000)}",
            "type": random.choice(event_types),
            "timestamp": base_time + timedelta(seconds=i),
            "value": round(random.uniform(1.0, 500.0), 2)
        })
    return documents

# Generate and load 1 million events
print("Generating documents...")
docs = generate_events(1_000_000)
print("Loading into MongoDB...")
bulk_insert(docs, batch_size=5000)
```

## Monitoring Bulk Load Progress

Check insertion rate in real time with mongostat:

```bash
mongostat --host localhost:27017 --rowcount 0 1
```

Watch the `insert` column for current operations per second.

## Optimal Batch Size Guidelines

```text
Small documents (<1KB):  batch_size = 5000-10000
Medium documents (1-10KB): batch_size = 1000-2000
Large documents (>10KB):   batch_size = 100-500
```

Individual documents cannot exceed 16MB. The driver automatically splits large batches to stay within MongoDB's 48MB wire protocol message limit.

## Summary

Efficient bulk loading into MongoDB requires using `insert_many` with `ordered=False` in large batches, deferring index builds until after load completion, and optionally relaxing write concern during the load window. `mongoimport` with `--numInsertionWorkers` is the fastest option for flat file loads. For very large datasets, dropping and rebuilding indexes after loading can reduce total load time by 50% or more compared to inserting with all indexes active.
