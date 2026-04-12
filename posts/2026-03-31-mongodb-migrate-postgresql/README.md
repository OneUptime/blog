# How to Migrate from PostgreSQL to MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Migration, PostgreSQL, Database, Schema

Description: Learn how to migrate data and schema from PostgreSQL to MongoDB, including JSONB migration, denormalization strategies, and data type mapping.

---

## Migration Planning

PostgreSQL is a relational database with strong typing, JSONB support, and complex join capabilities. MongoDB stores data as flexible documents. A migration from PostgreSQL to MongoDB should take advantage of MongoDB's document model by embedding related data rather than maintaining normalized foreign key relationships.

```mermaid
flowchart LR
    PG[PostgreSQL tables] --> Analyze[Analyze query patterns]
    Analyze --> Design[Design MongoDB schema]
    Design --> Export[Export as JSON]
    Export --> Transform[Transform data]
    Transform --> Import[Import to MongoDB]
    Import --> Index[Create indexes]
```

## PostgreSQL to MongoDB Type Mapping

| PostgreSQL Type | MongoDB BSON Type |
|---|---|
| INTEGER, BIGINT | Int32, Int64 |
| NUMERIC, DECIMAL | Decimal128 |
| REAL, DOUBLE PRECISION | Double |
| VARCHAR, TEXT | String |
| BOOLEAN | Boolean |
| TIMESTAMP, TIMESTAMPTZ | Date |
| DATE | Date |
| JSONB, JSON | Object / Array |
| UUID | String or BinData (UUID subtype) |
| ARRAY | Array |
| NULL | null |

## Step 1: Export PostgreSQL Tables to JSON

PostgreSQL's `row_to_json` and `json_agg` functions make JSON export straightforward:

```bash
# Export a single table as JSON Lines
psql -U postgres -d myapp -c "
COPY (
  SELECT row_to_json(u)
  FROM (
    SELECT id, name, email, status, created_at AS \"createdAt\"
    FROM users
  ) u
) TO STDOUT;
" > /tmp/users.json
```

Export with nested JSONB data:

```bash
psql -U postgres -d myapp -c "
COPY (
  SELECT row_to_json(p)
  FROM (
    SELECT
      id,
      name,
      price,
      category,
      attributes,  -- already JSONB, maps naturally
      created_at AS \"createdAt\"
    FROM products
  ) p
) TO STDOUT;
" > /tmp/products.json
```

## Step 2: Denormalize Related Tables with Python

For tables linked by foreign keys, join and embed them before importing:

```python
import psycopg2
import json
from datetime import datetime, date
from decimal import Decimal

def serialize(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat() + "Z"
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Type {type(obj)} not serializable")

conn = psycopg2.connect(
    host="localhost",
    database="myapp",
    user="postgres",
    password="password"
)
conn.set_client_encoding("UTF8")

cursor = conn.cursor()
items_cursor = conn.cursor()

cursor.execute("""
    SELECT
        o.id,
        o.customer_id,
        o.status,
        o.total,
        o.created_at,
        c.email AS customer_email,
        c.name AS customer_name
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
""")

with open("/tmp/orders.json", "w") as f:
    for row in cursor:
        order_id = row[0]

        items_cursor.execute("""
            SELECT
                product_id,
                product_name,
                quantity,
                unit_price
            FROM order_items
            WHERE order_id = %s
        """, (order_id,))

        items = [
            {
                "productId": item[0],
                "productName": item[1],
                "quantity": item[2],
                "unitPrice": float(item[3])
            }
            for item in items_cursor.fetchall()
        ]

        doc = {
            "orderId": row[0],
            "customerId": row[1],
            "status": row[2],
            "total": float(row[3]),
            "createdAt": row[4].isoformat() + "Z",
            "customer": {
                "email": row[5],
                "name": row[6]
            },
            "items": items
        }

        f.write(json.dumps(doc, default=serialize) + "\n")

cursor.close()
items_cursor.close()
conn.close()
print("Export complete")
```

## Step 3: Handle PostgreSQL Arrays

PostgreSQL arrays export as JSON arrays naturally. Verify they import correctly:

```bash
# Export array fields
psql -U postgres -d myapp -c "
COPY (
  SELECT row_to_json(t)
  FROM (
    SELECT id, name, tags::json AS tags
    FROM articles
  ) t
) TO STDOUT;
" > /tmp/articles.json
```

In MongoDB the `tags` field becomes an array natively, allowing `$in` and `$all` queries:

```javascript
db.articles.find({ tags: { $in: ["mongodb", "database"] } })
db.articles.find({ tags: { $all: ["mongodb", "performance"] } })
```

## Step 4: Handle UUIDs

PostgreSQL uses UUID primary keys. You can store them as strings in MongoDB or convert to the native ObjectId:

```python
import uuid

# Option A: Store as string (preserves UUID)
doc = { "_id": str(row["id"]) }

# Option B: Use a new ObjectId and store the old UUID as a reference
from bson import ObjectId
doc = { "_id": ObjectId(), "pgId": str(row["id"]) }
```

Option A is simpler for migration but creates string `_id` fields which are larger than ObjectId.

## Step 5: Import with mongoimport

```bash
mongoimport \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --db myapp \
  --collection orders \
  --file /tmp/orders.json

mongoimport \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --db myapp \
  --collection users \
  --file /tmp/users.json
```

For large files, increase parallelism:

```bash
mongoimport \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --db myapp \
  --collection orders \
  --file /tmp/orders.json \
  --numInsertionWorkers 4
```

## Step 6: Create Indexes

```javascript
db = db.getSiblingDB("myapp");

// Replace PostgreSQL B-tree indexes with MongoDB indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ status: 1, createdAt: -1 });

db.orders.createIndex({ customerId: 1, createdAt: -1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ "items.productId": 1 });

// Full-text search to replace pg_trgm or ILIKE queries
db.articles.createIndex({ title: "text", body: "text" });
```

## Step 7: Validate

```bash
# PostgreSQL row counts
psql -U postgres -d myapp -c "
SELECT relname AS table_name, n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
"
```

```javascript
// MongoDB document counts
db.getCollectionNames().forEach(c => {
  print(c + ": " + db[c].countDocuments());
});
```

## JSONB Columns Migrate Naturally

One advantage of PostgreSQL-to-MongoDB migration: JSONB columns map directly to MongoDB subdocuments. If your PostgreSQL schema already uses JSONB heavily, the MongoDB document model will feel familiar.

```javascript
// PostgreSQL: SELECT attributes->>'color' FROM products WHERE attributes->>'color' = 'red'
// MongoDB equivalent:
db.products.find({ "attributes.color": "red" })

// PostgreSQL: SELECT * FROM products WHERE attributes @> '{"size": "XL"}'::jsonb
// MongoDB equivalent:
db.products.find({ "attributes.size": "XL" })
```

## Summary

PostgreSQL-to-MongoDB migration involves exporting tables as JSON (using `row_to_json`), transforming normalized tables into embedded documents using Python, importing with mongoimport, and creating indexes. JSONB columns migrate with minimal transformation. Handle UUIDs by storing as strings or converting to ObjectId. After import, validate document counts against PostgreSQL row counts and spot-check critical records for data integrity.
