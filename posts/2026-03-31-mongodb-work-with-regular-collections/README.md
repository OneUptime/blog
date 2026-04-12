# How to Work with Regular Collections in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collection, Schema, Index, Data Modeling

Description: Learn how to create, configure, and manage regular MongoDB collections effectively, including schema validation, indexing, and collection-level options.

---

## What Is a Regular Collection

In MongoDB, a regular collection is the standard, general-purpose collection type. Unlike capped collections (fixed-size), time series collections (optimized for temporal data), or clustered collections (organized by a specific key), regular collections have no constraints on document order, insertion rate, or document retention. They are the default collection type and suitable for the vast majority of use cases.

## Creating a Regular Collection

Collections are created implicitly when you first insert a document, or explicitly using `createCollection`.

```javascript
// Implicit creation on first insert
db.users.insertOne({ name: "Alice", email: "alice@example.com" });

// Explicit creation with options
db.createCollection("orders", {
  collation: { locale: "en", strength: 2 },  // Case-insensitive string comparison
  comment: "Stores customer orders"
});
```

## Adding Schema Validation

Regular collections support JSON Schema validation to enforce document structure without a strict schema-on-write database design.

```javascript
db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "price", "sku"],
      properties: {
        name: {
          bsonType: "string",
          description: "Product name - required string"
        },
        price: {
          bsonType: "double",
          minimum: 0,
          description: "Price must be a non-negative number"
        },
        sku: {
          bsonType: "string",
          pattern: "^[A-Z]{3}-[0-9]{5}$"
        }
      }
    }
  },
  validationAction: "error"   // Reject invalid documents
});
```

## Creating Indexes on Regular Collections

Regular collections support the full range of MongoDB index types: single field, compound, multikey, text, geospatial, and hashed.

```javascript
// Single field index
db.orders.createIndex({ customerId: 1 });

// Compound index for common query patterns
db.orders.createIndex({ status: 1, createdAt: -1 });

// Unique constraint
db.users.createIndex({ email: 1 }, { unique: true });

// Partial index to save space
db.orders.createIndex(
  { customerId: 1 },
  { partialFilterExpression: { status: "active" } }
);
```

## Specifying Read/Write Concerns Per Operation

You can specify read and write concerns on individual operations:

```javascript
const collection = db.getSiblingDB("myapp").getCollection("criticalData");

// Use majority write concern for this insert
collection.insertOne(
  { type: "audit", action: "login", userId: "u123" },
  { writeConcern: { w: "majority", j: true } }
);
```

## Listing Collection Metadata

Use `listCollections` to inspect collection configuration:

```javascript
// List all collections with their options
db.listCollections().toArray().forEach(c => printjson(c));

// Check a specific collection
db.listCollections({ name: "orders" }).toArray();
```

## Checking Collection Statistics

```javascript
// View size, document count, and index information
db.orders.stats();

// Compact collection to reclaim disk space
db.runCommand({ compact: "orders" });
```

## Summary

Regular MongoDB collections are the standard building block for most applications. They support flexible schemas with optional JSON Schema validation, all index types, and configurable read/write concerns. Creating indexes that match your query patterns and adding validation rules at the collection level - rather than relying on application-layer checks - leads to more reliable and performant data storage. Use explicit collection creation with `createCollection` when you need to set collation, validation, or storage options at the time of collection creation.
