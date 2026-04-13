# How to Migrate from MySQL to MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, MySQL, Migration, Database Migration, Data Modeling

Description: Learn how to plan and execute a migration from MySQL to MongoDB, including schema redesign, data export, transformation, and application-layer changes.

---

## Overview

Migrating from MySQL to MongoDB involves more than copying data - it requires rethinking the data model. MySQL is relational with strict schemas; MongoDB is document-oriented with flexible schemas. This guide covers schema design decisions, data migration tools, and application changes.

## Step 1 - Analyze Your MySQL Schema

Before migrating, catalog your MySQL tables and relationships:

```sql
-- List all tables
SHOW TABLES;

-- Get row counts
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'myapp';

-- Check foreign key relationships
SELECT
  kcu.table_name,
  kcu.column_name,
  kcu.referenced_table_name,
  kcu.referenced_column_name
FROM information_schema.key_column_usage kcu
WHERE kcu.constraint_schema = 'myapp'
  AND kcu.referenced_table_name IS NOT NULL;
```

## Step 2 - Redesign the Schema for MongoDB

The most important migration decision is whether to embed or reference related data.

### MySQL: Normalized Tables

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE
);

CREATE TABLE addresses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT REFERENCES users(id),
  street VARCHAR(255),
  city VARCHAR(100),
  zip VARCHAR(20)
);

CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT REFERENCES users(id),
  total DECIMAL(10,2),
  created_at DATETIME
);
```

### MongoDB: Embedded vs Referenced

Embed if you always access address with the user:

```javascript
// Embedded address (good when always accessed together)
{
  "_id": ObjectId("..."),
  "name": "Alice",
  "email": "alice@example.com",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "zip": "10001"
  }
}
```

Reference orders because they are many and queried independently:

```javascript
// Orders collection (referenced, not embedded)
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),
  "total": 99.99,
  "createdAt": ISODate("2026-03-31")
}
```

## Step 3 - Export Data from MySQL

```bash
# Export each table to CSV
mysqldump --no-create-info --tab=/tmp/export/ \
  --fields-terminated-by=',' --fields-optionally-enclosed-by='"' \
  myapp users orders addresses

# Or export to JSON using the mysql client
mysql -u root -p -N myapp -e "
  SELECT JSON_OBJECT(
    'id', id,
    'name', name,
    'email', email
  ) FROM users;
" > /tmp/users.json
```

## Step 4 - Transform Data

Use a script to transform relational rows into MongoDB documents:

```python
import pymysql
from pymongo import MongoClient
from bson import ObjectId
import datetime

# Connect to both databases
mysql_conn = pymysql.connect(host="localhost", user="root", password="pass", db="myapp")
mongo_client = MongoClient("mongodb://localhost:27017/")
mongo_db = mongo_client["myapp"]

cursor = mysql_conn.cursor(pymysql.cursors.DictCursor)

# Migrate users with embedded addresses
cursor.execute("""
  SELECT u.id, u.name, u.email,
         a.street, a.city, a.zip
  FROM users u
  LEFT JOIN addresses a ON a.user_id = u.id
""")

id_map = {}   # map MySQL int IDs to MongoDB ObjectIds

for row in cursor.fetchall():
    if row["id"] in id_map:
        continue  # skip extra rows from LEFT JOIN when user has multiple addresses

    oid = ObjectId()
    id_map[row["id"]] = oid

    doc = {
        "_id": oid,
        "name": row["name"],
        "email": row["email"],
        "mysqlId": row["id"]   # keep for reference during migration
    }

    if row["street"]:
        doc["address"] = {
            "street": row["street"],
            "city": row["city"],
            "zip": row["zip"]
        }

    mongo_db["users"].insert_one(doc)

print(f"Migrated {len(id_map)} users")

# Migrate orders, using the ID map to link to MongoDB user _ids
cursor.execute("SELECT id, user_id, total, created_at FROM orders")

orders = []
for row in cursor.fetchall():
    orders.append({
        "userId": id_map.get(row["user_id"]),
        "total": float(row["total"]),
        "createdAt": row["created_at"],
        "mysqlId": row["id"]
    })

if orders:
    mongo_db["orders"].insert_many(orders)
    print(f"Migrated {len(orders)} orders")

cursor.close()
mysql_conn.close()
mongo_client.close()
```

## Step 5 - Create Indexes

Recreate MySQL indexes as MongoDB indexes:

```javascript
// Unique index for email (replaces UNIQUE constraint)
db.users.createIndex({ email: 1 }, { unique: true });

// Index for looking up orders by user
db.orders.createIndex({ userId: 1, createdAt: -1 });

// Replace MySQL full-text index
db.articles.createIndex({ title: "text", content: "text" });
```

## Step 6 - Update Application Code

Replace SQL queries with MongoDB driver calls:

```javascript
// Before (MySQL)
const [rows] = await mysql.execute(
  "SELECT * FROM users WHERE email = ?",
  [email]
);
const user = rows[0];

// After (MongoDB)
const user = await db.collection("users").findOne({ email });
```

```javascript
// Before (MySQL JOIN)
const [rows] = await mysql.execute(`
  SELECT o.*, u.name, u.email
  FROM orders o
  JOIN users u ON u.id = o.user_id
  WHERE o.user_id = ?
`, [userId]);

// After (MongoDB $lookup)
const orders = await db.collection("orders").aggregate([
  { $match: { userId } },
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
    }
  },
  { $unwind: "$user" }
]).toArray();
```

## Step 7 - Validate and Clean Up

After migration, compare row counts and spot-check data:

```javascript
// Verify counts match
const mysqlUserCount = 50000;  // from MySQL
const mongoUserCount = await db.collection("users").countDocuments();
console.assert(mongoUserCount === mysqlUserCount, "User count mismatch");

// Remove migration helper fields once verified
await db.collection("users").updateMany({}, { $unset: { mysqlId: "" } });
await db.collection("orders").updateMany({}, { $unset: { mysqlId: "" } });
```

## Summary

Migrating from MySQL to MongoDB requires three parallel workstreams: data model redesign (embed vs reference), data export and transformation (usually a Python or Node.js script mapping MySQL rows to MongoDB documents), and application query migration (replacing SQL with aggregation pipelines). Always preserve MySQL IDs temporarily as `mysqlId` fields during migration for debugging and validation, and remove them once the migration is verified.
