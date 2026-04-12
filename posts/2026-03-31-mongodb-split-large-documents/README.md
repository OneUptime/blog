# How to Split Large Documents in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Document, Schema Design, Performance, Refactoring

Description: Learn techniques to split large MongoDB documents into smaller related documents to avoid the 16MB limit and improve query and update performance.

---

## When to Split Large Documents

Documents grow large in MongoDB when arrays contain too many elements, embedded subdocuments accumulate unbounded data, or full history is stored inline. Splitting improves performance in three ways: smaller documents fit in RAM more efficiently, partial updates touch less data, and queries that don't need all fields complete faster.

## Pattern 1: Move Array Elements to a Child Collection

The most common cause of large documents is an unbounded array. Extract array elements to a child collection:

**Before (document grows indefinitely):**

```javascript
{
  _id: "order_123",
  customerId: "cust_abc",
  status: "active",
  lineItems: [
    { sku: "A", qty: 2, price: 9.99 },
    { sku: "B", qty: 1, price: 19.99 }
    // ...potentially thousands of items
  ]
}
```

**After (parent + child collections):**

```javascript
// orders collection (parent - stays small)
{ _id: "order_123", customerId: "cust_abc", status: "active", itemCount: 2 }

// order_items collection (child - one document per item)
{ _id: ObjectId(), orderId: "order_123", sku: "A", qty: 2, price: 9.99 }
{ _id: ObjectId(), orderId: "order_123", sku: "B", qty: 1, price: 19.99 }
```

Migration script:

```javascript
db.orders.find({ lineItems: { $exists: true } }).forEach(order => {
  // Insert items into child collection
  if (order.lineItems && order.lineItems.length > 0) {
    const items = order.lineItems.map(item => ({
      orderId: order._id,
      ...item
    }));
    db.order_items.insertMany(items);
  }

  // Update parent to remove the array
  db.orders.updateOne(
    { _id: order._id },
    {
      $set: { itemCount: (order.lineItems || []).length },
      $unset: { lineItems: "" }
    }
  );
});
```

## Pattern 2: Bucket Pattern for Time-Series Data

For documents that accumulate time-series events, use the bucket pattern to limit document size:

```javascript
// Instead of one document per device with all readings...
// Use one document per device per hour with up to N readings

{
  deviceId: "sensor_42",
  hour: ISODate("2024-01-15T14:00:00Z"),
  readings: [
    { ts: ISODate("2024-01-15T14:01:00Z"), temp: 22.1 },
    { ts: ISODate("2024-01-15T14:02:00Z"), temp: 22.3 }
    // max 60 readings per document (one per minute)
  ],
  count: 2,
  minTemp: 22.1,
  maxTemp: 22.3
}
```

Insert a new reading into the correct bucket:

```javascript
db.sensor_data.updateOne(
  {
    "deviceId": "sensor_42",
    "hour": new Date(Math.floor(Date.now() / 3600000) * 3600000),
    "count": { $lt: 60 }
  },
  {
    $push: { readings: { ts: new Date(), temp: 22.5 } },
    $inc: { count: 1 },
    $min: { minTemp: 22.5 },
    $max: { maxTemp: 22.5 }
  },
  { upsert: true }
);
```

## Pattern 3: Vertical Splitting for Wide Documents

For documents with many fields where queries only access a subset, split vertically:

```javascript
// Core document - accessed on every request
{ _id: "user_123", email: "user@example.com", name: "Jane" }

// Extended profile - accessed rarely
{ _id: "user_123", bio: "...(long text)...", preferences: {...}, history: [...] }
```

Split a wide document:

```javascript
db.users.find({}).forEach(user => {
  const { _id, email, name, bio, preferences, history, ...rest } = user;

  // Keep core fields in users
  db.users.replaceOne({ _id }, { _id, email, name });

  // Move large fields to user_profiles
  db.user_profiles.insertOne({ _id, bio, preferences, history });
});
```

## Verifying the Split Worked

After splitting, verify document sizes are within safe bounds:

```javascript
["orders", "order_items"].forEach(coll => {
  const stats = db[coll].stats();
  print(`${coll}: avg ${(stats.avgObjSize / 1024).toFixed(1)} KB, count ${stats.count}`);
});

// Check no large documents remain
const large = db.orders.aggregate([
  { $project: { size: { $bsonSize: "$$ROOT" } } },
  { $match: { size: { $gt: 100000 } } },
  { $count: "total" }
]).toArray();

print(`Documents over 100KB: ${large[0]?.total || 0}`);
```

## Summary

Splitting large MongoDB documents uses three main patterns: extracting unbounded arrays to child collections with a foreign key reference, applying the bucket pattern to group time-series events into fixed-size documents, and vertical splitting to separate frequently accessed core fields from rarely accessed wide fields. Always verify document sizes after splitting and add appropriate indexes to the new collections.
