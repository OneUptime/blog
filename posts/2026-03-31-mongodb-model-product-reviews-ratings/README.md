# How to Model Product Reviews and Ratings in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, Schema, Aggregation, Review

Description: Learn how to model product reviews and ratings in MongoDB using separate collections, denormalized averages, and efficient aggregation for rating summaries.

---

## Design Choices: Embedded vs. Referenced Reviews

You have two primary choices: embed reviews inside the product document, or store them in a separate `reviews` collection. Embedding works for products that receive very few reviews, but for a real e-commerce site, reviews can number in the thousands, which would blow past MongoDB's 16 MB document limit. The recommended approach is a separate `reviews` collection with a denormalized `avgRating` and `reviewCount` on the product.

## Product Document with Denormalized Stats

```javascript
{
  _id: ObjectId("prod_001"),
  name: "Wireless Headphones Pro",
  category: "electronics",
  price: 149.99,
  avgRating: 4.5,
  reviewCount: 847,
  ratingDistribution: {
    "1": 12, "2": 18, "3": 65, "4": 210, "5": 542
  }
}
```

The `ratingDistribution` map lets you render a histogram without an aggregation query.

## Review Document Schema

```javascript
{
  _id: ObjectId("..."),
  productId: ObjectId("prod_001"),
  userId: ObjectId("..."),
  username: "jsmith",
  rating: 5,
  title: "Best headphones I've owned",
  body: "Great sound quality and comfortable for long sessions.",
  verifiedPurchase: true,
  helpfulVotes: 34,
  createdAt: ISODate("2026-02-15T14:30:00Z"),
  updatedAt: ISODate("2026-02-15T14:30:00Z")
}
```

## Adding a New Review

When a user submits a review, insert the review document and update the product's stats atomically:

```javascript
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    await db.reviews.insertOne(review, { session });

    const oldProduct = await db.products.findOne({ _id: productId }, { session });
    const newCount = oldProduct.reviewCount + 1;
    const newAvg = ((oldProduct.avgRating * oldProduct.reviewCount) + review.rating) / newCount;
    const ratingKey = String(review.rating);

    await db.products.updateOne(
      { _id: productId },
      {
        $set: { avgRating: Math.round(newAvg * 10) / 10, reviewCount: newCount },
        $inc: { [`ratingDistribution.${ratingKey}`]: 1 }
      },
      { session }
    );
  });
} finally {
  await session.endSession();
}
```

## Querying Reviews with Pagination

Fetch the most helpful reviews for a product:

```javascript
db.reviews.find({ productId: ObjectId("prod_001") })
  .sort({ helpfulVotes: -1, createdAt: -1 })
  .skip(0)
  .limit(10);
```

Index to support this query:

```javascript
db.reviews.createIndex({ productId: 1, helpfulVotes: -1, createdAt: -1 });
db.reviews.createIndex({ productId: 1, rating: 1 }); // for rating filter
db.reviews.createIndex({ productId: 1, userId: 1 }, { unique: true }); // one review per user
```

## Recomputing Average Ratings

If the denormalized stats drift (which can happen due to bugs or retries), recompute from the source:

```javascript
db.reviews.aggregate([
  { $match: { productId: ObjectId("prod_001") } },
  { $group: {
    _id: "$productId",
    avgRating: { $avg: "$rating" },
    reviewCount: { $sum: 1 },
    dist1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
    dist2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
    dist3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
    dist4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
    dist5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } }
  }}
]);
```

## Summary

Modeling product reviews in MongoDB works best with a dedicated `reviews` collection referenced by `productId`, combined with denormalized `avgRating`, `reviewCount`, and `ratingDistribution` fields on the product document. Use transactions when inserting reviews to keep stats consistent, a unique compound index on `(productId, userId)` to enforce one review per user, and helpfulness-based indexes to serve the most useful reviews first.
