# How to Convert ObjectId to String in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, ObjectId, Aggregation, Type Conversion, Query

Description: Learn how to convert a MongoDB ObjectId to a string using $toString in aggregation, .toString() in the shell, and driver methods for use in APIs and data exports.

---

Converting ObjectIds to strings is common when building APIs (JSON doesn't have an ObjectId type), exporting data, or storing references as readable identifiers. MongoDB provides several ways to do this depending on the context.

## Convert in mongosh

In the MongoDB shell, call `.toString()` or `.toHexString()` on an ObjectId:

```javascript
const id = ObjectId("64f1a2b3c4d5e6f7a8b9c0d1")

// Method 1
id.toString()
// Returns: "64f1a2b3c4d5e6f7a8b9c0d1"

// Method 2
id.toHexString()
// Returns: "64f1a2b3c4d5e6f7a8b9c0d1"
```

## Convert in Aggregation with $toString

Use `$toString` to convert the `_id` field (or any ObjectId field) to a string within an aggregation pipeline:

```javascript
db.orders.aggregate([
  {
    $addFields: {
      idString: { $toString: "$_id" },
      customerIdString: { $toString: "$customerId" }
    }
  },
  {
    $project: {
      _id: 0,
      idString: 1,
      customerIdString: 1,
      amount: 1,
      status: 1
    }
  }
])
```

## Extract the Timestamp from an ObjectId

ObjectIds encode a creation timestamp in their first 4 bytes. Extract it as a date or string:

```javascript
db.orders.aggregate([
  {
    $addFields: {
      createdFromId: { $toDate: "$_id" },
      idString: { $toString: "$_id" }
    }
  }
])
```

`$toDate` converts the embedded timestamp to a proper Date object.

## Convert in Node.js

```javascript
const { ObjectId } = require("mongodb")

const id = new ObjectId("64f1a2b3c4d5e6f7a8b9c0d1")

// Convert to string
const idString = id.toString()
// or
const idString2 = id.toHexString()

console.log(idString)  // "64f1a2b3c4d5e6f7a8b9c0d1"
```

When returning documents from a REST API, map the `_id` field:

```javascript
const doc = await db.collection("users").findOne({ _id: id })
const response = { ...doc, id: doc._id.toString() }
delete response._id
res.json(response)
```

## Convert in Python with PyMongo

```python
from bson import ObjectId

doc_id = ObjectId("64f1a2b3c4d5e6f7a8b9c0d1")

# Convert to string
id_string = str(doc_id)
print(id_string)  # "64f1a2b3c4d5e6f7a8b9c0d1"
```

In a FastAPI or Flask response, use a custom encoder or Pydantic validator:

```python
from pydantic import BaseModel, field_validator
from bson import ObjectId

class OrderResponse(BaseModel):
    id: str
    amount: float
    status: str

    @field_validator("id", mode="before")
    @classmethod
    def convert_objectid(cls, v):
        return str(v) if isinstance(v, ObjectId) else v
```

## Use $convert for Bulk Transformations

When migrating a collection to use string IDs, `$convert` with `$out` can transform the entire collection:

```javascript
db.orders.aggregate([
  {
    $addFields: {
      _id: { $toString: "$_id" }
    }
  },
  { $out: "orders_with_string_ids" }
])
```

## Summary

Convert ObjectIds to strings using `$toString` in aggregation pipelines, `.toString()` in mongosh, or driver-specific methods in application code. When serializing documents to JSON for APIs, always convert `_id` to a string to avoid serialization errors. Use `$toDate` alongside `$toString` to extract the embedded creation timestamp from an ObjectId.
