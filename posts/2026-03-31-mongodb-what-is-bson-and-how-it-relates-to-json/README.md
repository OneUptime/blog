# What Is BSON and How It Relates to JSON in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, BSON, JSON, Data Format, Driver

Description: Learn what BSON is, how it extends JSON with additional data types, and how MongoDB drivers handle BSON serialization and deserialization transparently.

---

## What Is BSON

BSON stands for Binary JSON. It is a binary-encoded serialization format that MongoDB uses internally to store and transmit documents. BSON was designed to be more efficient than JSON for storage and traversal, and to support additional data types that JSON does not have.

MongoDB developed BSON specifically for its use case. The BSON specification is published at bsonspec.org and is used by all official MongoDB drivers.

## How BSON Extends JSON

JSON supports only six data types: null, boolean, number, string, array, and object. BSON adds several important types:

```text
BSON Type         JSON Equivalent     Notes
ObjectId          string (as "$oid")  12-byte unique identifier
Date              number (as "$date") Milliseconds since Unix epoch
Int32             number              Explicit 32-bit integer
Int64             number (as "$numberLong") 64-bit integer
Decimal128        string (as "$numberDecimal") High-precision decimal
Binary            string (as "$binary") Arbitrary binary data
Regular Expression none               Native regex support
Timestamp         none                Internal MongoDB type
MinKey/MaxKey     none                Sentinel values for sorting
```

## Working with BSON Types in MongoDB Shell

```javascript
// ObjectId - auto-generated unique _id
db.users.insertOne({ name: "Alice" });
db.users.findOne();
// { _id: ObjectId("507f1f77bcf86cd799439011"), name: "Alice" }

// Dates - stored as BSON Date, not string
db.events.insertOne({ event: "signup", timestamp: new Date() });
db.events.find({ timestamp: { $gte: ISODate("2024-01-01") } });

// Number types
db.metrics.insertOne({
  intValue: NumberInt(42),       // 32-bit int
  longValue: NumberLong("9007199254740993"),  // 64-bit int beyond JS safe integer
  decimalValue: NumberDecimal("19.99")  // Exact decimal for financial data
});
```

## BSON vs JSON: Size and Performance

BSON is often slightly larger than JSON for simple documents but provides faster field lookup and better type fidelity:

```python
import bson
import json
import sys

doc = {
    "name": "Alice Johnson",
    "age": 28,
    "score": 98.6,
    "active": True,
    "tags": ["admin", "user"],
    "metadata": {"region": "us-east", "tier": "premium"}
}

json_bytes = len(json.dumps(doc).encode("utf-8"))
bson_bytes = len(bson.encode(doc))

print(f"JSON size: {json_bytes} bytes")
print(f"BSON size: {bson_bytes} bytes")
print(f"Overhead:  {((bson_bytes / json_bytes) - 1) * 100:.1f}%")
```

BSON includes a document-level length prefix and size information for values, enabling fast skip-ahead traversal without parsing all field values.

## How MongoDB Drivers Handle BSON

Drivers serialize your language objects to BSON automatically. You generally never write raw BSON:

```javascript
// Node.js - driver handles BSON transparently
const { MongoClient, ObjectId } = require("mongodb");

const doc = {
  _id: new ObjectId(),      // Becomes BSON ObjectId
  createdAt: new Date(),    // Becomes BSON Date
  price: 19.99              // Becomes BSON Double
};

await collection.insertOne(doc);
// Driver serializes to BSON, MongoDB stores BSON, driver deserializes back to JS object
```

```python
# Python with pymongo
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timezone

doc = {
    "_id": ObjectId(),           # BSON ObjectId
    "created_at": datetime.now(timezone.utc),  # BSON Date
    "amount": 19.99              # BSON Double
}
collection.insert_one(doc)
```

## Extended JSON (EJSON)

When you need to represent BSON types in human-readable JSON format (e.g., for APIs or logging), use Extended JSON:

```json
{
  "_id": { "$oid": "507f1f77bcf86cd799439011" },
  "createdAt": { "$date": "2024-01-15T10:30:00.000Z" },
  "price": 19.99,
  "quantity": { "$numberInt": "42" },
  "revenue": { "$numberDecimal": "799.58" }
}
```

The `mongosh` shell outputs Extended JSON for BSON types. The `bsondump` utility converts binary BSON files to Extended JSON for inspection:

```bash
bsondump --outFile=output.json mydb.orders.bson
```

## BSON Size Limits

BSON documents have a 16MB maximum size. BSON arrays do not have a per-element limit, but the total document (including all nested arrays and subdocuments) must fit within 16MB.

```javascript
// Check BSON size of a document in the shell (MongoDB 4.4+)
db.orders.aggregate([
  { $project: { bsonSize: { $bsonSize: "$$ROOT" } } },
  { $match: { bsonSize: { $gt: 1024 * 1024 } } }  // Documents over 1MB
]);
```

## Summary

BSON is a binary encoding of JSON-like documents with extended type support including ObjectId, Date, Int32, Int64, Decimal128, and Binary. MongoDB stores all data as BSON internally and uses BSON for client-server wire protocol. Drivers serialize language objects to BSON transparently so you rarely interact with raw BSON directly. Extended JSON (EJSON) is the human-readable representation of BSON types used in APIs, logs, and export utilities.
