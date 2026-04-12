# How to Migrate from MongoDB to DynamoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, DynamoDB, Migration, AWS, NoSQL

Description: Guide for migrating data from MongoDB to Amazon DynamoDB, covering key design, data transformation, access pattern mapping, and import strategies.

---

## Overview

Migrating from MongoDB to Amazon DynamoDB requires rethinking your data model around DynamoDB's key-value and single-table design principles. MongoDB supports flexible queries on any field; DynamoDB requires all access patterns to be planned in advance through partition keys, sort keys, and Global Secondary Indexes (GSIs).

## Redesign Your Data Model

DynamoDB is optimized for access patterns defined at table design time. Analyze your MongoDB queries to determine what partition and sort keys you need.

```text
MongoDB collection: orders
Common queries:
1. Get all orders for a customer
2. Get orders by status within a date range
3. Get a single order by ID

DynamoDB key design:
- PK: CUSTOMER#{customerId}  SK: ORDER#{orderId}  (query 1)
- GSI1PK: STATUS#{status}    GSI1SK: CREATED_AT#{timestamp} (query 2)
- Single order by ID: PK = ORDER#{orderId} (overloaded or separate GSI)
```

## Export Data from MongoDB

```bash
mongoexport \
  --uri="mongodb://localhost:27017/mydb" \
  --collection=orders \
  --out=orders.json \
  --jsonArray
```

## Transform and Load into DynamoDB

Use Python's `boto3` to write transformed documents to DynamoDB:

```python
import json, boto3
from datetime import datetime

dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
table = dynamodb.Table("MyApp")

with open("orders.json") as f:
  orders = json.load(f)

with table.batch_writer() as batch:
  for order in orders:
    order_id = str(order.get("_id", {}).get("$oid", order.get("_id", "")))
    customer_id = order.get("customerId", "")
    status = order.get("status", "unknown")
    created_at = order.get("createdAt", datetime.utcnow().isoformat())
    total = str(order.get("total", 0))  # DynamoDB Decimal, store as string

    # Main record (customer-order access pattern)
    batch.put_item(Item={
      "PK": f"CUSTOMER#{customer_id}",
      "SK": f"ORDER#{order_id}",
      "orderId": order_id,
      "status": status,
      "total": total,
      "createdAt": str(created_at),
      # GSI keys for status-based queries
      "GSI1PK": f"STATUS#{status}",
      "GSI1SK": f"CREATED_AT#{created_at}"
    })
```

## Handle DynamoDB Data Type Limitations

The boto3 SDK does not accept Python `float` values for DynamoDB number attributes - use `Decimal` to avoid floating-point precision issues:

```python
from decimal import Decimal

def convert_for_dynamodb(obj):
  if isinstance(obj, float):
    return Decimal(str(obj))
  if isinstance(obj, dict):
    return {k: convert_for_dynamodb(v) for k, v in obj.items()}
  if isinstance(obj, list):
    return [convert_for_dynamodb(i) for i in obj]
  return obj
```

## Translate MongoDB Queries to DynamoDB

```javascript
// MongoDB: get all orders for a customer
db.orders.find({ customerId: "c-123" }).sort({ createdAt: -1 });
```

```python
# DynamoDB equivalent using Query
response = table.query(
  KeyConditionExpression="PK = :pk",
  ExpressionAttributeValues={":pk": "CUSTOMER#c-123"},
  ScanIndexForward=False  # descending order
)
orders = response["Items"]
```

```javascript
// MongoDB: get pending orders after a date
db.orders.find({ status: "pending", createdAt: { $gte: startDate } });
```

```python
# DynamoDB: query GSI
response = table.query(
  IndexName="GSI1",
  KeyConditionExpression="GSI1PK = :pk AND GSI1SK >= :sk",
  ExpressionAttributeValues={
    ":pk": "STATUS#pending",
    ":sk": f"CREATED_AT#{start_date.isoformat()}"
  }
)
```

## Validate the Migration

```python
# Check total item count (note: DynamoDB count is approximate)
response = dynamodb.meta.client.describe_table(TableName="MyApp")
approx_count = response["Table"]["ItemCount"]
print(f"DynamoDB approximate item count: {approx_count}")

from pymongo import MongoClient
mongo_count = MongoClient("mongodb://localhost:27017").mydb.orders.count_documents({})
print(f"MongoDB count: {mongo_count}")
```

## Summary

Migrating from MongoDB to DynamoDB requires upfront access pattern analysis to design partition keys, sort keys, and GSIs correctly. DynamoDB's single-table design is powerful but inflexible - queries not covered by defined indexes require expensive scans. Invest time in key design before writing a single line of migration code, as redesigning keys after data is loaded is expensive.
