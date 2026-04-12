# How to Implement Referential Integrity in MongoDB Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Integrity, Schema, Validation, Data Modeling

Description: Learn how to enforce referential integrity in MongoDB applications using schema validation, application-layer checks, change streams, and denormalization strategies.

---

## Referential Integrity in a Document Database

MongoDB does not enforce foreign key constraints. A `reviews` document can reference a `productId` that has been deleted. Maintaining referential integrity is the application's responsibility. There are several complementary techniques.

## Technique 1: Schema Validator with $lookup-Style Checks

MongoDB's `$jsonSchema` validator enforces field types but not cross-collection references. Use it to at least ensure referenced IDs are the right type:

```javascript
db.runCommand({
  collMod: "reviews",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["productId", "userId", "rating"],
      properties: {
        productId: { bsonType: "objectId" },
        userId:    { bsonType: "objectId" },
        rating:    { bsonType: "int", minimum: 1, maximum: 5 }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

## Technique 2: Application-Layer Pre-Checks

Check that the referenced document exists before inserting the referencing document:

```javascript
async function createReview(productId, userId, reviewData) {
  // Verify parent exists
  const product = await db.products.findOne(
    { _id: productId },
    { projection: { _id: 1 } }
  );
  if (!product) throw new Error(`Product ${productId} not found`);

  const user = await db.users.findOne(
    { _id: userId },
    { projection: { _id: 1 } }
  );
  if (!user) throw new Error(`User ${userId} not found`);

  return db.reviews.insertOne({ productId, userId, ...reviewData, createdAt: new Date() });
}
```

## Technique 3: Cascade Deletes via Change Streams

When a product is deleted, cascade the delete to reviews using a change stream:

```javascript
const productChangeStream = db.products.watch([
  { $match: { operationType: "delete" } }
]);

productChangeStream.on("change", async (event) => {
  const deletedProductId = event.documentKey._id;
  const result = await db.reviews.deleteMany({ productId: deletedProductId });
  console.log(`Cascaded delete: removed ${result.deletedCount} reviews for product ${deletedProductId}`);
});
```

## Technique 4: Soft Deletes to Preserve References

Instead of deleting parent documents, mark them as inactive. This preserves the reference chain:

```javascript
await db.products.updateOne(
  { _id: productId },
  { $set: { deleted: true, deletedAt: new Date() } }
);
```

Then filter deleted products out of queries:

```javascript
db.products.find({ deleted: { $ne: true } });
```

Ensure new documents include `deleted: false` on creation, then create a partial index that covers only active documents:

```javascript
db.products.createIndex(
  { category: 1 },
  { partialFilterExpression: { deleted: false } }
);
```

## Technique 5: Detect Orphaned References with Aggregation

Periodically scan for orphaned documents:

```javascript
db.reviews.aggregate([
  { $lookup: {
    from: "products",
    localField: "productId",
    foreignField: "_id",
    as: "product"
  }},
  { $match: { product: { $size: 0 } } },
  { $project: { _id: 1, productId: 1, createdAt: 1 } }
]);
```

Run this as a scheduled job and alert when orphan counts exceed a threshold.

## Denormalization as a Consistency Strategy

Embedding a snapshot of referenced data at write time avoids the need for joins and makes reads self-contained:

```javascript
// Store product name with the review at creation time
await db.reviews.insertOne({
  productId: product._id,
  productName: product.name,  // snapshot
  userId,
  rating,
  createdAt: new Date()
});
```

The snapshot may become stale if the product name changes, but the review record remains self-consistent for historical display.

## Summary

Referential integrity in MongoDB requires a combination of schema validators to enforce field types, application-layer pre-checks to verify parent existence before insert, change streams to cascade deletes reactively, soft-delete patterns to preserve reference chains, and periodic orphan-detection aggregations. No single technique covers all cases - layer them based on how critical consistency is for each relationship in your data model.
