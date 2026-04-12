# How to Serialize and Deserialize MongoDB Documents in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Node.js, BSON, Serialization, Driver

Description: Learn how to serialize and deserialize MongoDB documents in Node.js using the official driver, BSON package, and EJSON for handling ObjectId, Date, Decimal128, and Binary types.

---

## How the Node.js Driver Handles Types

The official MongoDB Node.js driver automatically serializes JavaScript objects to BSON when writing and deserializes BSON to JavaScript objects when reading. Understanding the type mappings prevents common bugs around dates, IDs, and decimal numbers.

## BSON Type Mappings

```text
JavaScript Type         <->  BSON Type
--------------------         ---------
string                       String
number (integer safe)        Int32 or Int64
number (float)               Double
boolean                      Boolean
null                         Null
Date                         Date
Buffer/Uint8Array            Binary
ObjectId (from bson pkg)     ObjectId
Decimal128 (from bson pkg)   Decimal128
Long (from bson pkg)         Int64
```

## Basic Document Insert and Read

```javascript
const { MongoClient, ObjectId } = require("mongodb");
const { Decimal128 } = require("bson");

const client = new MongoClient(uri);
const db = client.db("shop");

// Insert - JavaScript -> BSON
const doc = {
  _id: new ObjectId(),
  name: "Wireless Headphones",
  price: Decimal128.fromString("149.99"),  // Use Decimal128 for money
  qty: 50,                                  // int32
  tags: ["electronics", "audio"],
  createdAt: new Date(),                    // Maps to BSON Date
  active: true
};

await db.collection("products").insertOne(doc);

// Read - BSON -> JavaScript
const retrieved = await db.collection("products").findOne({ _id: doc._id });
console.log(retrieved._id instanceof ObjectId); // true
console.log(retrieved.createdAt instanceof Date); // true
console.log(retrieved.price.toString()); // "149.99"
```

## Converting ObjectId to/from String

```javascript
const { ObjectId } = require("mongodb");

// String to ObjectId (for queries from URL params)
const id = new ObjectId("507f1f77bcf86cd799439011");

// ObjectId to string (for JSON API responses)
const idString = id.toHexString(); // "507f1f77bcf86cd799439011"
// Or:
const idString2 = id.toString();

// Check if a string is a valid ObjectId
const isValid = ObjectId.isValid("507f1f77bcf86cd799439011"); // true
```

## Serializing Documents to JSON

The Node.js `JSON.stringify` cannot serialize ObjectId or Date correctly for all use cases:

```javascript
const { EJSON } = require("bson");

const doc = { _id: new ObjectId(), createdAt: new Date(), price: Decimal128.fromString("99.99") };

// Standard JSON - loses type info
console.log(JSON.stringify(doc));
// {"_id":"507f1f77bcf86cd799439011","createdAt":"2026-03-31T...","price":{"$numberDecimal":"99.99"}}
// ObjectId becomes a plain string (no way to distinguish from any other string)
// Decimal128 becomes a non-standard nested object

// EJSON - preserves BSON types as Extended JSON
console.log(EJSON.stringify(doc, null, 2));
// {"_id":{"$oid":"..."},"createdAt":{"$date":"..."},"price":{"$numberDecimal":"99.99"}}

// EJSON relaxed - human readable, safe for APIs
console.log(EJSON.stringify(doc, null, 2, { relaxed: true }));
// {"_id":"507f1f...","createdAt":"2026-03-31T...","price":99.99}
```

## Custom Transformation for REST APIs

```javascript
function documentToResponse(doc) {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    price: parseFloat(doc.price.toString()),  // Decimal128 -> float
    createdAt: doc.createdAt.toISOString(),
    tags: doc.tags
  };
}

app.get("/products/:id", async (req, res) => {
  const product = await db.collection("products").findOne({ _id: new ObjectId(req.params.id) });
  if (!product) return res.status(404).json({ error: "Not found" });
  res.json(documentToResponse(product));
});
```

## Working with Binary Data

```javascript
const { Binary } = require("bson");

// Store a file as Binary
const fileBuffer = await fs.promises.readFile("./image.png");
await db.collection("files").insertOne({
  name: "image.png",
  data: new Binary(fileBuffer),
  contentType: "image/png",
  createdAt: new Date()
});

// Retrieve and use the binary data
const file = await db.collection("files").findOne({ name: "image.png" });
const buffer = Buffer.from(file.data.buffer);
res.setHeader("Content-Type", file.contentType);
res.send(buffer);
```

## Summary

The MongoDB Node.js driver automatically serializes JavaScript objects to BSON on write and deserializes to JavaScript on read. Use `ObjectId` for document IDs, `Decimal128` for monetary values, and `Date` for timestamps. For JSON serialization, use `EJSON.stringify` with `{ relaxed: true }` for API responses to produce human-readable JSON with ObjectIds as strings. Avoid using `JSON.stringify` directly on documents containing ObjectId or Decimal128 fields.
