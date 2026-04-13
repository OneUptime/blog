# How to Migrate from MySQL to MongoDB with mongoimport

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Migration, MySQL, Import, Database

Description: Learn how to export data from MySQL and import it into MongoDB using mongoimport, including schema transformation, data type mapping, and relationship handling.

---

## Migration Strategy Overview

MySQL is a relational database with rigid schemas, normalized tables, and foreign key constraints. MongoDB is a document database that stores data as flexible JSON documents. A successful migration requires rethinking the data model, not just copying rows to collections.

```mermaid
flowchart LR
    MySQL[MySQL tables] --> Export[Export as CSV or JSON]
    Export --> Transform[Transform schema]
    Transform --> Import[mongoimport into MongoDB]
    Import --> Indexes[Create indexes]
    Indexes --> Validate[Validate document counts]
```

## MySQL Data Type Mapping

| MySQL Type | MongoDB BSON Type |
|---|---|
| INT, BIGINT | Int32, Int64 |
| FLOAT, DOUBLE | Double |
| DECIMAL | Decimal128 |
| VARCHAR, TEXT | String |
| DATE | ISODate (Date) |
| DATETIME, TIMESTAMP | ISODate (Date) |
| BOOLEAN, TINYINT(1) | Boolean |
| JSON | Object / Array |
| NULL | null |

## Step 1: Export MySQL Tables to CSV

```bash
# Export a single table to CSV
mysql -u root -p myapp -e "
SELECT id, name, email, created_at, status
FROM users
INTO OUTFILE '/tmp/users.csv'
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '\"'
LINES TERMINATED BY '\n';
"

# Export with headers
mysql -u root -p myapp --batch --silent -e "
SELECT 'id','name','email','created_at','status'
UNION
SELECT id, name, email, created_at, status FROM users;
" > /tmp/users_with_headers.tsv
```

## Step 2: Export to JSON for Better Type Preservation

JSON export preserves types better than CSV:

```bash
# Using JSON_OBJECT function (MySQL 5.7.22+)
mysql -u root -p myapp -e "
SELECT JSON_OBJECT(
  'id', id,
  'name', name,
  'email', email,
  'status', status,
  'createdAt', DATE_FORMAT(created_at, '%Y-%m-%dT%TZ'),
  'age', age
) AS doc
FROM users;
" | tail -n +2 > /tmp/users.json
```

For more complex exports with nested data, write a Python transform script:

```python
import mysql.connector
import json
from datetime import datetime, date

conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="password",
    database="myapp"
)

cursor = conn.cursor(dictionary=True)
cursor.execute("SELECT * FROM users")

with open("/tmp/users.json", "w") as f:
    for row in cursor:
        # Convert datetime objects to ISO strings
        doc = {}
        for key, value in row.items():
            if isinstance(value, (datetime, date)):
                doc[key] = value.isoformat() + "Z"
            else:
                doc[key] = value
        f.write(json.dumps(doc) + "\n")

print(f"Exported {cursor.rowcount} users")
conn.close()
```

## Step 3: Denormalize Related Tables

MySQL typically normalizes data across tables with foreign keys. MongoDB documents work best when related data is embedded.

Example: MySQL has `orders` and `order_items` tables joined by `order_id`. In MongoDB, embed items inside the order document:

```python
import mysql.connector
import json
from datetime import datetime

conn = mysql.connector.connect(
    host="localhost", user="root",
    password="password", database="ecommerce"
)

orders_cursor = conn.cursor(dictionary=True)
items_cursor = conn.cursor(dictionary=True)

orders_cursor.execute("SELECT * FROM orders")
orders = orders_cursor.fetchall()

with open("/tmp/orders.json", "w") as f:
    for order in orders:
        # Fetch line items for this order
        items_cursor.execute(
            "SELECT product_id, product_name, quantity, price "
            "FROM order_items WHERE order_id = %s",
            (order["id"],)
        )
        items = items_cursor.fetchall()

        doc = {
            "orderId": order["id"],
            "customerId": order["customer_id"],
            "status": order["status"],
            "total": float(order["total"]),
            "createdAt": order["created_at"].isoformat() + "Z",
            "items": [
                {
                    "productId": item["product_id"],
                    "productName": item["product_name"],
                    "quantity": item["quantity"],
                    "price": float(item["price"])
                }
                for item in items
            ]
        }
        f.write(json.dumps(doc) + "\n")

conn.close()
print("Orders exported with embedded items")
```

## Step 4: Import with mongoimport

Import a JSON array file (all documents wrapped in a single array):

```bash
mongoimport \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --db myapp \
  --collection users \
  --file /tmp/users.json \
  --jsonArray
```

For JSON Lines format (one document per line, no array wrapper):

```bash
mongoimport \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --db myapp \
  --collection users \
  --file /tmp/users.json
```

For TSV with a header row (produced by `mysql --batch`):

```bash
mongoimport \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --db myapp \
  --collection users \
  --type tsv \
  --headerline \
  --file /tmp/users_with_headers.tsv
```

## Step 5: Create Indexes

After import, create indexes to match your query patterns:

```javascript
// Connect with mongosh
db = db.getSiblingDB("myapp");

// Index for common queries
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ status: 1, createdAt: -1 });

db.orders.createIndex({ customerId: 1, createdAt: -1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ "items.productId": 1 });
```

## Step 6: Validate the Migration

Compare document counts:

```bash
# MySQL row counts (table_rows is approximate for InnoDB; use COUNT(*) per table for exact counts)
mysql -u root -p myapp -e "
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'myapp';
"
```

```javascript
// MongoDB document counts
db = db.getSiblingDB("myapp");
db.getCollectionNames().forEach(c => {
  print(c + ": " + db[c].countDocuments());
});
```

Spot-check specific records:

```javascript
// Verify a known user record
db.users.findOne({ email: "alice@example.com" })

// Verify order with embedded items
db.orders.findOne({ orderId: 12345 })
```

## Handling Auto-Increment IDs

MySQL uses `AUTO_INCREMENT` integer IDs. MongoDB uses `ObjectId` by default. You have two choices:

**Option A**: Keep MySQL integer IDs as the `_id` field:

```python
doc = {
    "_id": row["id"],  # Use MySQL id as MongoDB _id
    "name": row["name"],
    ...
}
```

**Option B**: Let MongoDB generate ObjectId and store the MySQL id as a separate field:

```python
doc = {
    "mysqlId": row["id"],  # Keep for reference
    "name": row["name"],
    ...
}
```

Option A is simpler for migration but may cause conflicts if different tables used the same ID values. Option B is cleaner for new MongoDB-native IDs.

## Summary

Migrating from MySQL to MongoDB requires exporting data as JSON (preferred) or CSV, transforming the relational structure by denormalizing related tables into embedded documents, importing with mongoimport, and creating appropriate indexes. Use a Python script for complex transformations where related tables need to be joined before import. Always compare document counts and spot-check critical records after the migration to verify data integrity.
