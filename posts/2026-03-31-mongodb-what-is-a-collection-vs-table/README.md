# What Is a MongoDB Collection and How It Differs from a Table

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collection, Concept, NoSQL, Schema

Description: Learn what a MongoDB collection is, how it compares to a relational database table, and the key differences in schema, indexing, and data organization.

---

## What Is a MongoDB Collection

A MongoDB collection is a group of documents stored in a MongoDB database. Collections are analogous to tables in relational databases but have fundamental differences in how they enforce structure. A collection can contain any number of documents, and those documents do not need to share the same fields or data types.

```javascript
// A collection named "orders" can hold documents with different shapes
db.orders.insertMany([
  { _id: 1, type: "online",   customerId: "c1", total: 49.99, items: [{ sku: "A" }] },
  { _id: 2, type: "in-store", cashierId: "emp_42", total: 12.50 },
  { _id: 3, type: "online",   customerId: "c2", total: 199.99, promoCode: "SAVE10" }
]);
```

## What Is a Relational Table

A relational table is a structured set of rows sharing the same schema. Every row must have values (or NULLs) for all defined columns. Adding a new attribute to a row requires altering the table schema first.

```sql
CREATE TABLE orders (
  id         SERIAL PRIMARY KEY,
  type       VARCHAR(20) NOT NULL,
  customer_id INT REFERENCES customers(id),
  total      DECIMAL(10,2) NOT NULL
);
```

## Key Differences

**1. Schema enforcement**

Tables enforce schema at the database level. Collections are schema-less by default but can optionally enforce schema via validation:

```javascript
// Optional: Add schema validation to a collection
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "name"],
      properties: {
        email: { bsonType: "string", pattern: "^.+@.+\\..+$" },
        name:  { bsonType: "string", minLength: 1 }
      }
    }
  },
  validationAction: "error"  // or "warn"
});
```

**2. Creating collections**

Collections are created implicitly on first insert:

```javascript
// This creates the "sessions" collection if it doesn't exist
db.sessions.insertOne({ userId: "u1", token: "abc123", createdAt: new Date() });

// Or explicitly with options
db.createCollection("logs", {
  capped: true,
  size: 104857600,  // 100MB cap
  max: 1000000      // max 1M documents
});
```

In SQL, you must create the table before inserting:

```sql
CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    INT NOT NULL,
  token      VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**3. Dropping and renaming**

```javascript
// Drop a collection (all documents deleted)
db.old_orders.drop();

// Rename a collection
db.recent_orders.renameCollection("orders_archive");

// List all collections
db.getCollectionNames();
```

**4. Collection-level settings**

Collections support WiredTiger storage options at creation:

```javascript
// Custom WiredTiger compression
db.createCollection("events", {
  storageEngine: {
    wiredTiger: { configString: "block_compressor=zstd" }
  }
});

// Native time-series collection
db.createCollection("sensor_readings", {
  timeseries: {
    timeField: "timestamp",
    metaField: "deviceId",
    granularity: "seconds"
  }
});
```

**5. Indexing differences**

Both tables and collections support indexes, but collection indexes are defined separately from the schema:

```javascript
// Create indexes on a collection after creation
db.orders.createIndex({ customerId: 1, createdAt: -1 });
db.orders.createIndex({ status: 1 }, { sparse: true });
db.orders.createIndex({ "items.sku": 1 });

// List indexes
db.orders.getIndexes();
```

**6. No foreign key enforcement**

Collections do not natively enforce referential integrity between collections. This is handled at the application layer:

```javascript
// Application must ensure referenced documents exist
async function createOrder(order) {
  const customer = await db.customers.findOne({ _id: order.customerId });
  if (!customer) throw new Error("Customer not found");
  return db.orders.insertOne(order);
}
```

## Practical Comparison

```text
Concept          Table                    Collection
Structure        Fixed schema             Flexible / optional schema
Row/Document     Same columns             Variable fields
Schema change    ALTER TABLE              Just insert new fields
Relationships    FOREIGN KEY              Application-level
Joins            SQL JOIN                 $lookup aggregation
Count            SELECT COUNT(*)          db.coll.countDocuments({})
Inspect schema   DESCRIBE table           db.coll.findOne() or $jsonSchema
```

## Summary

A MongoDB collection is a grouping of documents within a database that differs from a relational table in three primary ways: collections have no enforced schema by default, documents within the same collection can have different fields, and there is no foreign key enforcement between collections. Collections support optional JSON Schema validation when structure is needed, plus features like capped collections, time-series collections, and per-collection compression settings not available in standard relational tables.
