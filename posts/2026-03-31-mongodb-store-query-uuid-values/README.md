# How to Store and Query UUID Values in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, UUID, BinData, Identity

Description: Learn how to store RFC 4122 UUID values as BinData in MongoDB for efficient storage, how to query them correctly, and how to handle UUIDs across drivers.

---

## UUID Storage Options

You can store UUIDs in MongoDB in two ways:

1. **As a string** - human-readable but uses 36 bytes and lacks binary efficiency
2. **As BinData subtype 4** - 16 bytes, proper UUID semantics, driver-aware

BinData subtype 4 is the recommended approach for new applications.

## Storing UUIDs as BinData in mongosh

```javascript
// mongosh UUID() helper
const id = UUID("550e8400-e29b-41d4-a716-446655440000");
db.users.insertOne({ _id: id, name: "Alice" });

// Query back
db.users.findOne({ _id: UUID("550e8400-e29b-41d4-a716-446655440000") });
```

## Generating a New UUID in mongosh

```javascript
const newId = UUID();
print(newId); // UUID("550e8400-e29b-41d4-a716-446655440000")

db.sessions.insertOne({
  _id:       newId,
  userId:    "u-001",
  createdAt: new Date()
});
```

## Storing UUIDs in Node.js

```javascript
const { UUID } = require("bson");

const id = new UUID(); // generates a new v4 UUID
await collection.insertOne({ _id: id, name: "Bob" });

// Query with UUID instance
const doc = await collection.findOne({ _id: new UUID("550e8400-e29b-41d4-a716-446655440000") });
console.log(doc._id.toString()); // "550e8400-e29b-41d4-a716-446655440000"
```

## Storing UUIDs in Python

```python
import uuid
from bson.binary import Binary, UuidRepresentation
from pymongo import MongoClient

# Configure driver to use standard UUID representation
client = MongoClient(uuidRepresentation="standard")
collection = client.mydb.users

py_uuid = uuid.uuid4()
collection.insert_one({"_id": py_uuid, "name": "Carol"})

# Query
doc = collection.find_one({"_id": py_uuid})
print(doc["_id"])  # UUID object
```

## Querying UUID Fields

Always use the UUID type when querying - string comparison will not match BinData:

```javascript
// Correct
db.users.find({ externalId: UUID("550e8400-e29b-41d4-a716-446655440000") });

// Wrong - string does not match BinData
db.users.find({ externalId: "550e8400-e29b-41d4-a716-446655440000" });
```

## Indexing UUID Fields

UUID fields indexed as BinData benefit from efficient binary comparison:

```javascript
db.users.createIndex({ externalId: 1 }, { unique: true });
```

## Converting String UUIDs to BinData

If your collection stores UUIDs as strings, migrate them:

```javascript
db.users.find({ externalId: { $type: "string" } }).forEach(doc => {
  db.users.updateOne(
    { _id: doc._id },
    { $set: { externalId: UUID(doc.externalId) } }
  );
});
```

## Summary

Store UUIDs as BinData subtype 4 using `UUID()` in mongosh or the `UUID` class in drivers for correct semantics and compact 16-byte storage. Always query with UUID instances, not strings. Configure the PyMongo `uuidRepresentation` setting to `"standard"` for RFC 4122 compliance and cross-driver compatibility.
