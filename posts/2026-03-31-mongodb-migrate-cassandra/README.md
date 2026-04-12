# How to Migrate from Cassandra to MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Migration, Cassandra, Database, NoSQL

Description: Learn how to export data from Apache Cassandra and import it into MongoDB, covering data type mapping, denormalization, and query pattern migration.

---

## Migration Overview

Apache Cassandra is a wide-column store optimized for write-heavy, time-series, and IoT workloads with tables designed around specific query patterns. MongoDB is a document store with flexible schemas and rich query capabilities. Migrating to MongoDB usually means consolidating query-driven Cassandra tables into unified document collections.

```mermaid
flowchart LR
    Cassandra[Cassandra tables] --> COPY[COPY TO CSV]
    COPY --> CSV[CSV files]
    CSV --> Transform[Python transform]
    Transform --> JSON[JSON Lines files]
    JSON --> Import[mongoimport]
    Import --> Indexes[Create MongoDB indexes]
```

## Cassandra to MongoDB Type Mapping

| Cassandra Type | MongoDB BSON Type |
|---|---|
| text, varchar | String |
| int, smallint | Int32 |
| bigint, counter | Int64 |
| float | Double |
| double | Double |
| decimal | Decimal128 |
| boolean | Boolean |
| timestamp | Date |
| date | Date |
| uuid, timeuuid | String (or Binary UUID) |
| blob | Binary |
| list | Array |
| set | Array |
| map | Object |
| frozen<...> | Embedded document |

## Step 1: Export Cassandra Tables with COPY

Use `cqlsh` to export tables to CSV:

```bash
# Export a table to CSV
cqlsh -u cassandra -p password -e "
COPY myapp.users (
  user_id, name, email, status, created_at, tags
)
TO '/tmp/users.csv'
WITH HEADER = TRUE AND DELIMITER = ',' AND NULL = '';
"

# Export a time-series table
cqlsh -u cassandra -p password -e "
COPY myapp.events (
  user_id, event_time, event_type, payload
)
TO '/tmp/events.csv'
WITH HEADER = TRUE;
"
```

For large tables, increase parallelism:

```bash
cqlsh -u cassandra -p password -e "
COPY myapp.large_table TO '/tmp/large_table.csv'
WITH HEADER = TRUE AND NUMPROCESSES = 8 AND PAGESIZE = 5000;
"
```

## Step 2: Transform CSV to MongoDB JSON

Cassandra COPY exports types as strings. Convert them in Python:

```python
import csv
import json
from datetime import datetime
import ast

def parse_cassandra_timestamp(ts_str):
    """Parse Cassandra timestamp string to ISO format."""
    if not ts_str:
        return None
    try:
        # Cassandra exports as "2025-06-15 10:30:00+0000"
        dt = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S+0000")
        return dt.isoformat() + "Z"
    except ValueError:
        return ts_str

def parse_cassandra_list(val):
    """Parse Cassandra list/set exported as string like [a, b, c]."""
    if not val or val == "null":
        return []
    # Remove brackets and split
    val = val.strip("[]{}").strip()
    if not val:
        return []
    return [item.strip().strip("'") for item in val.split(",")]

def parse_cassandra_map(val):
    """Parse Cassandra map exported as string like {key1: val1, key2: val2}."""
    if not val or val == "null":
        return {}
    try:
        return ast.literal_eval(val)
    except Exception:
        return {}

def transform_users_csv(input_file, output_file):
    count = 0
    with open(input_file, "r", encoding="utf-8") as infile, \
         open(output_file, "w", encoding="utf-8") as outfile:

        reader = csv.DictReader(infile)
        for row in reader:
            doc = {
                "_id": row["user_id"],  # Use Cassandra primary key as _id
                "name": row["name"] or None,
                "email": row["email"] or None,
                "status": row["status"] or None,
                "createdAt": parse_cassandra_timestamp(row["created_at"]),
                "tags": parse_cassandra_list(row.get("tags", "")),
            }
            # Remove None values for cleaner documents
            doc = {k: v for k, v in doc.items() if v is not None}
            outfile.write(json.dumps(doc) + "\n")
            count += 1

    print(f"Transformed {count} users")

transform_users_csv("/tmp/users.csv", "/tmp/users_mongo.json")
```

## Step 3: Handle Cassandra's Query-Driven Table Design

Cassandra tables are often denormalized by design: the same logical entity may appear in multiple tables for different access patterns. For example:

- `orders_by_user` (partitioned by `user_id`)
- `orders_by_status` (partitioned by `status`)
- `orders_by_date` (partitioned by `date`)

In MongoDB, these become a single `orders` collection with multiple indexes:

```javascript
// One collection with indexes for all access patterns
db.orders.createIndex({ userId: 1, createdAt: -1 });
db.orders.createIndex({ status: 1, createdAt: -1 });
db.orders.createIndex({ createdAt: -1 });
```

Export from only one Cassandra table (the most complete one, usually the primary access path) to avoid duplicate documents.

## Step 4: Handle Counter Columns

Cassandra counter columns track incrementing values. Export them as regular numbers:

```bash
cqlsh -e "
COPY myapp.page_views (page_id, view_count)
TO '/tmp/page_views.csv'
WITH HEADER = TRUE;
"
```

In MongoDB, use `$inc` for counter updates:

```javascript
db.pageViews.updateOne(
  { pageId: "page-123" },
  { $inc: { viewCount: 1 } },
  { upsert: true }
);
```

## Step 5: Import into MongoDB

```bash
mongoimport \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --db myapp \
  --collection users \
  --file /tmp/users_mongo.json \
  --numInsertionWorkers 4

mongoimport \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --db myapp \
  --collection orders \
  --file /tmp/orders_mongo.json \
  --numInsertionWorkers 4
```

## Step 6: Create MongoDB Indexes

```javascript
db = db.getSiblingDB("myapp");

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ status: 1 });

db.orders.createIndex({ userId: 1, createdAt: -1 });
db.orders.createIndex({ status: 1, createdAt: -1 });

// Time-series events - TTL index if you want auto-expiry
db.events.createIndex({ userId: 1, eventTime: -1 });
db.events.createIndex({ eventTime: 1 }, { expireAfterSeconds: 7776000 }); // 90 days
```

## Step 7: Rewrite CQL Queries as MongoDB Queries

```javascript
// CQL: SELECT * FROM orders WHERE user_id = ? AND order_time > ?
// MongoDB:
db.orders.find({
  userId: "user-123",
  createdAt: { $gt: new Date("2025-01-01") }
}).sort({ createdAt: -1 });

// CQL: SELECT * FROM events WHERE user_id = ? LIMIT 100
// MongoDB:
db.events.find({ userId: "user-123" })
  .sort({ eventTime: -1 })
  .limit(100);

// CQL: UPDATE user_stats SET view_count = view_count + 1 WHERE user_id = ?
// MongoDB:
db.userStats.updateOne(
  { _id: "user-123" },
  { $inc: { viewCount: 1 } },
  { upsert: true }
);
```

## Validate the Migration

```bash
# Count Cassandra rows
cqlsh -e "SELECT COUNT(*) FROM myapp.users;"
```

```javascript
// Count MongoDB documents
db.users.countDocuments()

// Spot check a known user
db.users.findOne({ _id: "user-uuid-here" })
```

## Summary

Migrating from Cassandra to MongoDB involves exporting tables with `COPY TO CSV`, transforming Cassandra's string-encoded types and list/map formats to native JSON using Python, and importing with mongoimport. Cassandra's query-driven table design (multiple tables for one entity) should be consolidated into a single MongoDB collection with multiple indexes. Counter columns become regular fields updated with `$inc`. MongoDB's aggregation pipeline replaces the need for many of Cassandra's denormalized materialized views.
