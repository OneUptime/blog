# How to Migrate from MongoDB to PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, PostgreSQL, Migration, Database, Schema

Description: A practical guide for migrating from MongoDB to PostgreSQL, covering schema design, data transformation, JSONB options, and query translation.

---

## Overview

Migrating from MongoDB to PostgreSQL requires translating document schemas into relational tables and rewriting queries from MongoDB's API to SQL. PostgreSQL's `jsonb` type provides an escape hatch for semi-structured data, but a fully relational schema typically gives better query performance.

## Design the Target Schema

Map MongoDB collections to PostgreSQL tables. Embedded arrays become related tables (normalized) or `jsonb` columns (denormalized).

```sql
-- MongoDB: orders with embedded items
-- { _id, customerId, status, total, items: [{productId, qty, price}] }

-- PostgreSQL: normalized schema
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  status VARCHAR(50),
  total NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  qty INT NOT NULL,
  price NUMERIC(10, 2) NOT NULL
);
```

Or use `jsonb` for the items array if you do not need to query individual items:

```sql
-- PostgreSQL: jsonb for embedded array
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customer_id UUID,
  status VARCHAR(50),
  total NUMERIC(10, 2),
  items JSONB,  -- store items as JSONB
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Export from MongoDB

Use `mongoexport` to export collections as JSON or CSV:

```bash
mongoexport \
  --uri="mongodb://localhost:27017/mydb" \
  --collection=orders \
  --out=orders.json \
  --jsonArray
```

## Transform and Load with Python

```python
import json, psycopg2, uuid
from datetime import datetime, timezone

pg_conn = psycopg2.connect("dbname=mydb user=postgres host=localhost")
pg_cur = pg_conn.cursor()

with open("orders.json") as f:
  orders = json.load(f)

for order in orders:
  order_id = str(uuid.uuid4())
  pg_cur.execute(
    "INSERT INTO orders (id, customer_id, status, total, created_at) VALUES (%s, %s, %s, %s, %s)",
    (order_id, order.get("customerId"), order.get("status"),
     order.get("total"), order.get("createdAt") or datetime.now(timezone.utc))
  )
  for item in order.get("items", []):
    pg_cur.execute(
      "INSERT INTO order_items (id, order_id, product_id, qty, price) VALUES (%s, %s, %s, %s, %s)",
      (str(uuid.uuid4()), order_id, item["productId"], item["qty"], item["price"])
    )

pg_conn.commit()
print("Migration complete")
```

## Translate MongoDB Queries to SQL

Common query translations:

```javascript
// MongoDB
db.orders.find({ status: "pending", total: { $gt: 100 } }).sort({ createdAt: -1 });
```

```sql
-- PostgreSQL equivalent
SELECT * FROM orders
WHERE status = 'pending' AND total > 100
ORDER BY created_at DESC;
```

```javascript
// MongoDB aggregation: revenue by status
db.orders.aggregate([
  { $group: { _id: "$status", revenue: { $sum: "$total" } } }
]);
```

```sql
-- PostgreSQL equivalent
SELECT status, SUM(total) AS revenue
FROM orders
GROUP BY status;
```

## Handle MongoDB ObjectIds

MongoDB `_id` fields are ObjectIds. Convert them to strings or UUIDs in PostgreSQL:

```python
from bson import ObjectId

def mongo_id_to_uuid(oid):
  # Pad ObjectId (24 hex chars) to UUID (32 hex chars)
  padded = str(oid).ljust(32, "0")
  return f"{padded[:8]}-{padded[8:12]}-{padded[12:16]}-{padded[16:20]}-{padded[20:]}"
```

## Validate the Migration

```python
# Compare counts
pg_cur.execute("SELECT COUNT(*) FROM orders")
pg_count = pg_cur.fetchone()[0]

from pymongo import MongoClient
mongo_count = MongoClient("mongodb://localhost:27017").mydb.orders.count_documents({})
print(f"MongoDB: {mongo_count}, PostgreSQL: {pg_count}")
```

## Summary

Migrating from MongoDB to PostgreSQL involves normalizing embedded arrays into related tables, translating MongoDB queries to SQL, and handling ObjectId conversions. PostgreSQL's `jsonb` type provides a pragmatic middle ground for semi-structured data that does not fit cleanly into a relational model. Always validate counts and run your test suite against the PostgreSQL schema before cutting over production.
