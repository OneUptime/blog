# How to Implement Price History Tracking in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, Schema, History, Time Series

Description: Learn how to track product price history in MongoDB using a separate price events collection, time series collections, and efficient queries for price charts.

---

## Why Track Price History?

Price history powers features like "Lowest price in 30 days", price drop alerts, and trend charts. You also need it for financial audits. MongoDB gives you several approaches depending on your volume and query patterns.

## Option 1: Separate Price Events Collection

The most common approach is a `priceHistory` collection where each document records a price change event:

```javascript
{
  _id: ObjectId("..."),
  productId: ObjectId("prod_001"),
  price: 89.99,
  currency: "USD",
  effectiveFrom: ISODate("2026-01-15T00:00:00Z"),
  effectiveTo: null,  // null means currently active
  changedBy: "pricing-service",
  reason: "seasonal-sale",
  createdAt: ISODate("2026-01-15T00:00:00Z")
}
```

When a price changes, close the previous record and insert a new one:

```javascript
const now = new Date();

await db.priceHistory.updateOne(
  { productId: productId, effectiveTo: null },
  { $set: { effectiveTo: now } }
);

await db.priceHistory.insertOne({
  productId: productId,
  price: newPrice,
  currency: "USD",
  effectiveFrom: now,
  effectiveTo: null,
  changedBy: "pricing-service",
  reason: reason,
  createdAt: now
});

await db.products.updateOne(
  { _id: productId },
  { $set: { price: newPrice, priceUpdatedAt: now } }
);
```

## Option 2: Embedded Price Array with Capped Size

For products with infrequent price changes, embed recent history:

```javascript
{
  _id: ObjectId("prod_001"),
  price: 89.99,
  priceHistory: [
    { price: 99.99, from: ISODate("2025-11-01T00:00:00Z") },
    { price: 79.99, from: ISODate("2025-12-01T00:00:00Z") },
    { price: 89.99, from: ISODate("2026-01-15T00:00:00Z") }
  ]
}
```

Use `$push` with `$slice` to keep only the last N entries:

```javascript
db.products.updateOne(
  { _id: productId },
  {
    $set: { price: newPrice },
    $push: {
      priceHistory: {
        $each: [{ price: newPrice, from: new Date() }],
        $slice: -50
      }
    }
  }
);
```

## Option 3: MongoDB Time Series Collection

For high-frequency price data (algorithmic repricing), use a time series collection:

```javascript
db.createCollection("priceTimeSeries", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "hours"
  }
});

db.priceTimeSeries.insertOne({
  timestamp: new Date(),
  metadata: { productId: "prod_001", currency: "USD" },
  price: 89.99
});
```

## Querying Price History

Get the price as of a specific date:

```javascript
db.priceHistory.find(
  {
    productId: ObjectId("prod_001"),
    effectiveFrom: { $lte: targetDate },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gt: targetDate } }]
  }
).sort({ effectiveFrom: -1 }).limit(1);
```

Get the minimum price over the last 30 days:

```javascript
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
db.priceHistory.aggregate([
  { $match: { productId: ObjectId("prod_001"), effectiveFrom: { $gte: thirtyDaysAgo } } },
  { $group: { _id: null, minPrice: { $min: "$price" }, maxPrice: { $max: "$price" } } }
]);
```

## Indexes

```javascript
db.priceHistory.createIndex({ productId: 1, effectiveFrom: -1 });
db.priceHistory.createIndex({ productId: 1, effectiveTo: 1 });
```

## Summary

Price history tracking in MongoDB is best handled with a dedicated `priceHistory` collection using open-ended date ranges (`effectiveTo: null` for the active price). Use the `$slice` operator with embedded arrays for lightweight history, and MongoDB's native time series collections for high-frequency repricing scenarios. Indexes on `productId` with `effectiveFrom` enable fast point-in-time price lookups.
