# How to Work with Extended JSON in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, BSON, Extended JSON, Serialization, Data Type

Description: Learn how MongoDB Extended JSON represents BSON-specific types in JSON text, the difference between v1 and v2 formats, and how to use it for import, export, and APIs.

---

## Why Extended JSON Exists

Standard JSON has only six types: string, number, boolean, null, array, and object. BSON has over 20 types including ObjectId, Date, Int32, Int64, Decimal128, Binary, and Regex. Extended JSON is a convention for representing these BSON types in valid JSON text so they can be passed through JSON-only transports (REST APIs, files, logs) without losing type information.

## Extended JSON v2 (Canonical and Relaxed Modes)

MongoDB 4.0+ uses Extended JSON v2, which has two modes:

### Canonical Mode

Preserves exact type information. Use for data export and round-tripping where precision matters:

```json
{
  "_id":       { "$oid": "507f1f77bcf86cd799439011" },
  "price":     { "$numberDecimal": "149.99" },
  "qty":       { "$numberInt": "50" },
  "longValue": { "$numberLong": "1234567890123" },
  "createdAt": { "$date": { "$numberLong": "1711843200000" } },
  "active":    true,
  "data":      { "$binary": { "base64": "aGVsbG8=", "subType": "00" } }
}
```

### Relaxed Mode

Uses native JSON types where possible. Less precise but more human-readable:

```json
{
  "_id":       { "$oid": "507f1f77bcf86cd799439011" },
  "price":     149.99,
  "qty":       50,
  "createdAt": { "$date": "2024-03-31T00:00:00Z" },
  "active":    true
}
```

Note that `price` becomes a JSON number (IEEE 754 double), which loses the Decimal128 precision.

## Extended JSON v1 (Legacy)

Older MongoDB drivers and tools use v1 format. ObjectId is the same, but dates differ:

```json
{
  "_id": { "$oid": "507f1f77bcf86cd799439011" },
  "createdAt": { "$date": 1711843200000 },
  "qty": { "$numberLong": "50" }
}
```

## Using Extended JSON with mongoexport and mongoimport

`mongoexport` outputs Extended JSON by default:

```bash
mongoexport \
  --uri "mongodb://localhost:27017/shop" \
  --collection orders \
  --out orders.json
```

`mongoimport` reads Extended JSON and restores BSON types:

```bash
mongoimport \
  --uri "mongodb://localhost:27017/shop" \
  --collection orders \
  --file orders.json
```

## Parsing Extended JSON in Node.js

The `bson` package provides `EJSON` for parsing and serializing:

```javascript
const { EJSON } = require("bson");

// Parse Extended JSON string to JavaScript objects with BSON types
const json = '{"_id":{"$oid":"507f1f77bcf86cd799439011"},"createdAt":{"$date":"2026-03-31T00:00:00Z"}}';
const doc = EJSON.parse(json);
console.log(doc._id.constructor.name); // ObjectId
console.log(doc.createdAt instanceof Date); // true

// Serialize to Extended JSON string
const serialized = EJSON.stringify(doc, null, 2);
```

## Parsing Extended JSON in Python

```python
from bson import json_util
import json

# Deserialize Extended JSON to Python BSON types
raw = '{"_id": {"$oid": "507f1f77bcf86cd799439011"}, "createdAt": {"$date": "2026-03-31T00:00:00Z"}}'
doc = json.loads(raw, object_hook=json_util.object_hook)
print(type(doc["_id"]))      # <class 'bson.objectid.ObjectId'>
print(type(doc["createdAt"])) # <class 'datetime.datetime'>

# Serialize back to Extended JSON
serialized = json.dumps(doc, default=json_util.default)
```

## Extended JSON in REST APIs

When building a REST API that returns MongoDB documents, serialize using EJSON relaxed mode to produce valid JSON that preserves ObjectIds and Dates as strings:

```javascript
const express = require("express");
const { EJSON } = require("bson");

app.get("/orders/:id", async (req, res) => {
  const order = await db.orders.findOne({ _id: new ObjectId(req.params.id) });
  res.setHeader("Content-Type", "application/json");
  res.send(EJSON.stringify(order, null, 0, { relaxed: true }));
});
```

## Summary

Extended JSON bridges BSON's rich type system and the JSON ecosystem. Use canonical mode for lossless data export and import via mongoexport/mongoimport, relaxed mode for REST API responses where readability matters more than exact type fidelity, and the `EJSON` module in Node.js or `json_util` in Python to parse and serialize Extended JSON while preserving BSON types like ObjectId and Date.
