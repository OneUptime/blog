# How to Migrate from DynamoDB to MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Migration, DynamoDB, AWS, Database

Description: Learn how to export data from Amazon DynamoDB and import it into MongoDB, handling DynamoDB's type system, key schema, and nested attribute mapping.

---

## Migration Overview

DynamoDB is a key-value and document database with a flat partition/sort key model and per-attribute type annotations. MongoDB is a document database with rich query capabilities, secondary indexes, and aggregation pipelines. Migrating from DynamoDB to MongoDB typically improves query flexibility but requires remapping DynamoDB's type format.

```mermaid
flowchart LR
    DynamoDB[DynamoDB table] --> Export[DynamoDB Export to S3]
    Export --> S3[S3 bucket JSON files]
    S3 --> Transform[Python transform script]
    Transform --> Import[mongoimport to MongoDB]
    Import --> Indexes[Create secondary indexes]
```

## DynamoDB Type System vs MongoDB

DynamoDB uses explicit type annotations in its export format:

```json
{
  "id": { "S": "user-123" },
  "age": { "N": "30" },
  "active": { "BOOL": true },
  "tags": { "SS": ["admin", "user"] },
  "metadata": { "M": { "region": { "S": "us-east-1" } } }
}
```

MongoDB documents use native types without annotation wrappers:

```json
{
  "id": "user-123",
  "age": 30,
  "active": true,
  "tags": ["admin", "user"],
  "metadata": { "region": "us-east-1" }
}
```

## Step 1: Export DynamoDB Table to S3

Use DynamoDB's Point-in-Time Recovery (PITR) export:

```bash
aws dynamodb export-table-to-point-in-time \
  --table-arn arn:aws:dynamodb:us-east-1:123456789012:table/Users \
  --s3-bucket my-migration-bucket \
  --s3-prefix dynamodb-exports/ \
  --export-format DYNAMODB_JSON

echo "Export started - check status with:"
echo "aws dynamodb list-exports --table-arn arn:aws:dynamodb:us-east-1:123456789012:table/Users"
```

Wait for the export to complete:

```bash
aws dynamodb list-exports \
  --table-arn arn:aws:dynamodb:us-east-1:123456789012:table/Users \
  --query 'ExportSummaries[?ExportStatus==`COMPLETED`]'
```

Download the exported files:

```bash
aws s3 sync s3://my-migration-bucket/dynamodb-exports/ /tmp/dynamodb-exports/
```

The export is a directory of gzipped JSONL files.

## Step 2: Python Transform Script

Convert DynamoDB's typed format to plain MongoDB documents:

```python
import json
import gzip
import os

def convert_dynamodb_item(item):
    """Recursively convert DynamoDB typed attributes to plain Python."""
    if not isinstance(item, dict):
        return item

    # DynamoDB type keys
    if "S" in item:
        return item["S"]
    if "N" in item:
        # Convert number string to int or float
        val = item["N"]
        return int(val) if "." not in val else float(val)
    if "BOOL" in item:
        return item["BOOL"]
    if "NULL" in item:
        return None
    if "L" in item:
        return [convert_dynamodb_item(v) for v in item["L"]]
    if "M" in item:
        return {k: convert_dynamodb_item(v) for k, v in item["M"].items()}
    if "SS" in item:
        return list(item["SS"])
    if "NS" in item:
        return [float(n) if "." in n else int(n) for n in item["NS"]]
    if "BS" in item:
        return list(item["BS"])
    if "B" in item:
        return item["B"]

    # Nested document (already a plain dict at this level)
    return {k: convert_dynamodb_item(v) for k, v in item.items()}

def transform_export(export_dir, output_file):
    count = 0
    with open(output_file, "w") as out:
        for root, dirs, files in os.walk(export_dir):
            for filename in files:
                if not filename.endswith(".json.gz"):
                    continue
                filepath = os.path.join(root, filename)
                with gzip.open(filepath, "rt", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        # DynamoDB export wraps each item in {"Item": {...}}
                        wrapper = json.loads(line)
                        raw_item = wrapper.get("Item", wrapper)
                        doc = convert_dynamodb_item(raw_item)
                        out.write(json.dumps(doc) + "\n")
                        count += 1
                        if count % 10000 == 0:
                            print(f"Processed {count} items...")
    print(f"Total items transformed: {count}")

transform_export("/tmp/dynamodb-exports/", "/tmp/users_mongodb.json")
```

## Step 3: Handle DynamoDB Keys

DynamoDB uses a mandatory partition key and optional sort key. In MongoDB, decide how to map these:

**Option A**: Use the partition key as `_id` (if it is unique):

```python
def transform_item(raw_item):
    doc = convert_dynamodb_item(raw_item)
    # Rename DynamoDB partition key to _id
    if "PK" in doc:
        doc["_id"] = doc.pop("PK")
    if "SK" in doc:
        doc["sortKey"] = doc.pop("SK")
    return doc
```

**Option B**: Let MongoDB generate an ObjectId and store DynamoDB keys as regular fields:

```python
def transform_item(raw_item):
    doc = convert_dynamodb_item(raw_item)
    # Keep DynamoDB keys as regular fields for querying
    # MongoDB will generate _id automatically
    return doc
```

## Step 4: Import into MongoDB

```bash
mongoimport \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --db myapp \
  --collection users \
  --file /tmp/users_mongodb.json \
  --numInsertionWorkers 4
```

## Step 5: Create Secondary Indexes

DynamoDB Global Secondary Indexes (GSIs) become regular MongoDB indexes:

```javascript
db = db.getSiblingDB("myapp");

// If DynamoDB had a GSI on email
db.users.createIndex({ email: 1 }, { unique: true });

// If DynamoDB had a GSI on status + createdAt
db.users.createIndex({ status: 1, createdAt: -1 });

// DynamoDB sparse attributes become MongoDB sparse indexes
db.users.createIndex({ referralCode: 1 }, { sparse: true });
```

## Step 6: Update Application Queries

DynamoDB queries are limited to key-based access patterns. MongoDB allows arbitrary queries. Rewrite DynamoDB query patterns:

```javascript
// DynamoDB: Query by partition key
// await docClient.query({ TableName: "Users", KeyConditionExpression: "PK = :pk", ExpressionAttributeValues: { ":pk": "USER#123" } })

// MongoDB equivalent
db.users.findOne({ _id: "USER#123" })

// DynamoDB GSI query
// await docClient.query({ TableName: "Users", IndexName: "EmailIndex", KeyConditionExpression: "email = :email", ... })

// MongoDB equivalent (uses index automatically)
db.users.findOne({ email: "alice@example.com" })

// DynamoDB Scan (full table scan - expensive)
// await docClient.scan({ TableName: "Users", FilterExpression: "status = :status" })

// MongoDB equivalent (efficient with index)
db.users.find({ status: "active" })
```

## Step 7: Validate

```bash
# Count DynamoDB items
aws dynamodb describe-table --table-name Users \
  --query 'Table.ItemCount'
```

```javascript
// Count MongoDB documents
db.users.countDocuments()

// Spot-check a known item
db.users.findOne({ _id: "USER#123" })
```

## Summary

Migrating from DynamoDB to MongoDB requires exporting via DynamoDB's S3 export feature, transforming the DynamoDB typed attribute format (e.g., `{"S": "value"}`) to plain JSON using a Python script, importing with mongoimport, and replacing GSI access patterns with MongoDB compound indexes. MongoDB's query flexibility eliminates the need to design around access patterns in advance, which is the main operational benefit of this migration.
