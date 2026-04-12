# How to Migrate from CouchDB to MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, CouchDB, Migration, NoSQL, Database

Description: Learn how to migrate data from Apache CouchDB to MongoDB, including document transformation, ID mapping, and validation for a smooth cutover.

---

## Overview

CouchDB and MongoDB are both document databases, making migration structurally simpler than moving from a relational database. However, there are important differences in document structure, revision tracking, IDs, and API design that require careful handling.

## Key Differences to Understand

CouchDB documents have built-in `_id` and `_rev` (revision) fields used for multi-version concurrency control (MVCC). MongoDB uses `_id` but has no concept of `_rev`. CouchDB uses HTTP/REST for all operations; MongoDB uses a binary wire protocol.

```json
// CouchDB document
{
  "_id": "product-001",
  "_rev": "3-abc123def456",
  "name": "Widget",
  "price": 9.99,
  "tags": ["featured", "sale"]
}
```

```javascript
// MongoDB equivalent (drop _rev)
{
  "_id": "product-001",
  "name": "Widget",
  "price": 9.99,
  "tags": ["featured", "sale"]
}
```

## Export Data from CouchDB

Use CouchDB's `_all_docs` endpoint to export all documents:

```bash
# Export all documents from CouchDB database
curl -s "http://admin:password@localhost:5984/products/_all_docs?include_docs=true" \
  > couchdb_products_export.json
```

Or use the `couchdb-dump` tool for large databases:

```bash
npm install -g couchdb-dump
couchdb-dump "http://admin:password@localhost:5984/products" > products_dump.json
```

## Transform and Import to MongoDB

Write a Python script to strip CouchDB metadata and import into MongoDB:

```python
import json
from pymongo import MongoClient, InsertOne

# Load CouchDB export
with open("couchdb_products_export.json") as f:
  data = json.load(f)

mongo_client = MongoClient("mongodb://localhost:27017")
db = mongo_client["mydb"]

ops = []
for row in data["rows"]:
  doc = row["doc"]
  # Remove CouchDB-specific fields
  doc.pop("_rev", None)
  # Skip design documents
  if doc["_id"].startswith("_design/"):
    continue
  ops.append(InsertOne(doc))

if ops:
  result = db.products.bulk_write(ops, ordered=False)
  print(f"Inserted {result.inserted_count} documents")
```

## Handle CouchDB Design Documents and Views

CouchDB views (MapReduce functions) have no direct MongoDB equivalent. You need to convert them to MongoDB aggregation pipelines or application-level queries.

```javascript
// CouchDB view: count by category
// map: function(doc) { if (doc.category) emit(doc.category, 1); }
// reduce: _count

// MongoDB equivalent
db.products.aggregate([
  { $group: { _id: "$category", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
```

## Handle CouchDB Attachments

CouchDB supports binary attachments. If you use attachments, export them separately and store references in MongoDB with the binary in an external store like S3.

```python
import requests, boto3

s3 = boto3.client("s3")

def migrate_attachments(doc_id, attachments, bucket):
  for att_name, att_meta in attachments.items():
    url = f"http://admin:pass@localhost:5984/mydb/{doc_id}/{att_name}"
    response = requests.get(url)
    key = f"attachments/{doc_id}/{att_name}"
    s3.put_object(Bucket=bucket, Key=key, Body=response.content, ContentType=att_meta["content_type"])
    print(f"Uploaded {key}")
  return {name: f"s3://{bucket}/attachments/{doc_id}/{name}" for name in attachments}
```

## Validate the Migration

```python
# Compare document counts
curl_count = requests.get("http://admin:pass@localhost:5984/products").json()["doc_count"]
mongo_count = db.products.count_documents({})
print(f"CouchDB: {curl_count}, MongoDB: {mongo_count}")
```

## Update Application Code

Replace CouchDB HTTP calls with MongoDB driver calls:

```javascript
// Before (CouchDB HTTP API)
// fetch(`http://couch:5984/products/${id}`)

// After (MongoDB)
db.collection("products").findOne({ _id: id });
```

## Summary

Migrating from CouchDB to MongoDB is straightforward for document content since both store JSON. The main tasks are stripping `_rev` fields, converting design document views to aggregation pipelines, and migrating attachments to an external store. Validate counts and spot-check documents after the migration before redirecting application traffic.
