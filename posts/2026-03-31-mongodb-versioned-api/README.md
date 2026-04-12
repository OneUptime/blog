# How to Build a Versioned API with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, API, Versioning, Schema, Migration

Description: Learn how to build a versioned REST API backed by MongoDB, handling schema evolution with version fields, transformations, and backward-compatible migrations.

---

API versioning and database schema evolution are tightly coupled challenges. MongoDB's flexible document model makes it possible to support multiple API versions simultaneously while migrating data incrementally rather than with big-bang migrations.

## Adding a Schema Version Field

Include a `schemaVersion` field on every document so the application can apply the correct transformation logic.

```javascript
db.products.insertOne({
  schemaVersion: 2,
  name: "Widget Pro",
  priceCents: 2999,
  categories: ["tools", "hardware"],
  createdAt: new Date()
});
```

Version 1 documents stored `price` as a float. Version 2 documents store `priceCents` as an integer to avoid floating-point errors.

## Reading with Version-Aware Transforms

In your API handler, transform the document based on its `schemaVersion` before returning it.

```javascript
function toApiV1(doc) {
  return {
    id: doc._id,
    name: doc.name,
    price: doc.schemaVersion >= 2
      ? doc.priceCents / 100
      : doc.price
  };
}

function toApiV2(doc) {
  return {
    id: doc._id,
    name: doc.name,
    priceCents: doc.schemaVersion >= 2
      ? doc.priceCents
      : Math.round(doc.price * 100),
    categories: doc.categories || []
  };
}
```

## Routing by API Version

Express.js route example that serves v1 and v2 responses from the same collection.

```javascript
const { ObjectId } = require("mongodb");

app.get("/v1/products/:id", async (req, res) => {
  const doc = await db.collection("products").findOne({ _id: new ObjectId(req.params.id) });
  res.json(toApiV1(doc));
});

app.get("/v2/products/:id", async (req, res) => {
  const doc = await db.collection("products").findOne({ _id: new ObjectId(req.params.id) });
  res.json(toApiV2(doc));
});
```

## Lazy Migration on Read

Update the document to the latest schema version when it is read, spreading migration load across normal traffic.

```javascript
const { ObjectId } = require("mongodb");

async function getProduct(id) {
  const doc = await db.collection("products").findOne({ _id: new ObjectId(id) });
  if (doc.schemaVersion < 2) {
    const updated = {
      ...doc,
      priceCents: Math.round(doc.price * 100),
      schemaVersion: 2
    };
    delete updated.price;
    await db.collection("products").replaceOne({ _id: new ObjectId(id) }, updated);
    return updated;
  }
  return doc;
}
```

## Bulk Migration for Production

When you are ready to fully migrate, use an aggregation pipeline with `$merge` to batch-update old documents.

```javascript
db.products.aggregate([
  { $match: { schemaVersion: { $lt: 2 } } },
  {
    $set: {
      priceCents: { $round: [{ $multiply: ["$price", 100] }, 0] },
      schemaVersion: 2
    }
  },
  { $unset: "price" },
  { $merge: { into: "products", whenMatched: "replace" } }
]);
```

## Summary

Versioned APIs backed by MongoDB are best handled through schema version fields on every document and version-aware transform functions in the application layer. Lazy migration on read distributes the migration cost without downtime, while bulk aggregation pipelines with `$merge` allow full cutover when you are ready. This pattern keeps the collection in a mixed-version state safely and lets you deprecate old API versions on your own timeline.
