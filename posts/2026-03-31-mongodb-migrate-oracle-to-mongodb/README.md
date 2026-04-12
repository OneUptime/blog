# How to Migrate from Oracle to MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Oracle, Migration, Database, Schema

Description: Step-by-step guide to migrating data and schema from Oracle Database to MongoDB, including data modeling changes, ETL tools, and validation strategies.

---

## Overview

Migrating from Oracle to MongoDB involves more than copying data - it requires rethinking your relational schema as documents. Oracle is a row-based relational database with strict schema enforcement, stored procedures, and SQL. MongoDB is a document database with a flexible schema and a different query model.

## Plan the Schema Transformation

The first step is mapping your Oracle tables to MongoDB collections. Related data that was normalized across tables should often be embedded in MongoDB documents.

```text
Oracle schema (normalized):
  TABLE customers (id, name, email)
  TABLE addresses (id, customer_id, street, city, zip)
  TABLE orders (id, customer_id, total, status, created_at)
  TABLE order_items (id, order_id, product_id, qty, price)

MongoDB schema (embedded):
  Collection: customers
  {
    _id: ObjectId,
    name, email,
    addresses: [{ street, city, zip }],    // embedded
    orders: [                               // embedded for recent orders
      { orderId, total, status, createdAt,
        items: [{ productId, qty, price }] }
    ]
  }
```

## Export Data from Oracle

Use Oracle SQL*Plus to export to CSV (as shown below), SQL Developer for visual exports, or a JDBC-based ETL tool.

```sql
-- Oracle: export a table to CSV using SQL*Plus
SET MARKUP CSV ON DELIMITER ','
SET HEADING ON
SPOOL /export/customers.csv
SELECT id, name, email FROM customers;
SPOOL OFF
```

Alternatively, use an ETL tool like AWS Database Migration Service (DMS) with a MongoDB target.

## Transform and Load with Python

Write a transformation script to reshape relational rows into MongoDB documents.

```python
import oracledb
from pymongo import MongoClient, InsertOne
import json

oracle_conn = oracledb.connect("user/pass@oracle-host/ORCL")
mongo_client = MongoClient("mongodb://localhost:27017")
db = mongo_client["mydb"]

oracle_cur = oracle_conn.cursor()

# Fetch customers with their addresses
oracle_cur.execute("""
  SELECT c.id, c.name, c.email,
         a.street, a.city, a.zip
  FROM customers c
  LEFT JOIN addresses a ON a.customer_id = c.id
  ORDER BY c.id
""")

customers = {}
for row in oracle_cur:
  cid, name, email, street, city, zipcode = row
  if cid not in customers:
    customers[cid] = {"_id": str(cid), "name": name, "email": email, "addresses": []}
  if street:
    customers[cid]["addresses"].append({"street": street, "city": city, "zip": zipcode})

# Bulk insert into MongoDB
ops = [InsertOne(doc) for doc in customers.values()]
db.customers.bulk_write(ops, ordered=False)
print(f"Inserted {len(ops)} customers")
```

## Handle Oracle-Specific Types

Oracle has data types with no direct MongoDB equivalent. Handle conversions explicitly:

```python
import datetime

def convert_oracle_value(val):
  if isinstance(val, oracledb.LOB):
    return val.read()  # CLOB/BLOB to string/bytes
  if isinstance(val, datetime.datetime):
    return val  # MongoDB accepts Python datetime
  if val is None:
    return None
  return val
```

## Validate the Migration

Compare row counts and spot-check data after migration.

```python
# Validation: compare counts
oracle_cur.execute("SELECT COUNT(*) FROM customers")
oracle_count = oracle_cur.fetchone()[0]

mongo_count = db.customers.count_documents({})

print(f"Oracle: {oracle_count}, MongoDB: {mongo_count}")
assert oracle_count == mongo_count, "Count mismatch!"
```

## Update Application Code

Replace Oracle SQL and JDBC/cx_Oracle calls with MongoDB queries:

```javascript
// Before (Oracle via JDBC or SQL)
// SELECT * FROM orders WHERE customer_id = ? AND status = 'pending'

// After (MongoDB)
db.orders.find({ customerId: "c-123", status: "pending" });
```

## Summary

Migrating from Oracle to MongoDB requires careful schema redesign to flatten normalized tables into embedded documents. Use Python or a dedicated ETL tool to transform and load data, validate counts and spot-check records after migration, and replace SQL queries with MongoDB's query API. Plan for iterative testing before cutting over production traffic.
