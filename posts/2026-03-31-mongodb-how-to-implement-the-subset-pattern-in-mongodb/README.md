# How to Implement the Subset Pattern in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, Subset Pattern, Performance, Schema Design

Description: Learn how to implement the subset pattern in MongoDB to keep frequently accessed data in the main document while storing the full dataset in a separate collection.

---

## What Is the Subset Pattern?

The subset pattern splits a document into two parts: a "hot" subset with frequently accessed fields (kept in the main document) and a "cold" full dataset stored in a separate collection. This keeps working documents small, improving memory efficiency and query performance.

## The Problem: Large Working Documents

Imagine a product page displaying the 5 most recent reviews, but the product has 10,000 reviews total:

```javascript
// Anti-pattern: all reviews embedded
{
  _id: ObjectId("p001"),
  name: "iPhone 15",
  price: 999,
  reviews: [
    // 10,000 review subdocuments
    // Most are never shown on page load
  ]
}
```

Problems:
- Document could exceed 16MB
- All 10,000 reviews load into WiredTiger cache even when only 5 are displayed
- Memory is wasted on cold data

## The Solution: Embed a Subset

Keep only the most recent or most important N reviews in the product document:

```javascript
// Product document - hot subset of reviews
{
  _id: ObjectId("p001"),
  name: "iPhone 15",
  price: 999,
  reviewCount: 10000,
  avgRating: 4.7,
  recentReviews: [
    {
      author: "alice",
      rating: 5,
      body: "Amazing phone!",
      createdAt: ISODate("2026-03-30T00:00:00Z")
    },
    {
      author: "bob",
      rating: 4,
      body: "Great but expensive",
      createdAt: ISODate("2026-03-29T00:00:00Z")
    }
    // Only 5 most recent reviews
  ]
}

// Separate reviews collection - full dataset
{
  _id: ObjectId("rev001"),
  productId: ObjectId("p001"),
  author: "alice",
  rating: 5,
  body: "Amazing phone!",
  createdAt: ISODate("2026-03-30T00:00:00Z")
}
```

## Fetching Data with the Subset Pattern

For the product page (most common case - just show recent reviews):

```javascript
// Fast: small document, recent reviews already embedded
db.products.findOne({ _id: ObjectId("p001") })
```

For a "view all reviews" page:

```javascript
// Paginated query from full reviews collection
db.reviews.find({ productId: ObjectId("p001") })
  .sort({ createdAt: -1 })
  .skip(page * 20)
  .limit(20)
```

## Maintaining the Subset on Write

When a new review is added, insert into the full collection and update the embedded subset:

```javascript
async function addReview(productId, review) {
  const now = new Date();
  const fullReview = { ...review, createdAt: now };

  // Insert full review
  await db.reviews.insertOne({
    productId: ObjectId(productId),
    ...fullReview
  });

  // Update product with new review in subset (keep only last 5)
  await db.products.updateOne(
    { _id: ObjectId(productId) },
    {
      $push: {
        recentReviews: {
          $each: [fullReview],
          $sort: { createdAt: -1 },
          $slice: 5  // Keep only 5 most recent
        }
      },
      $inc: { reviewCount: 1 },
      $set: { lastReviewedAt: now }
    }
  );
}
```

## Indexing for the Full Dataset Collection

```javascript
db.reviews.createIndex({ productId: 1, createdAt: -1 })
db.reviews.createIndex({ productId: 1, rating: -1 })
```

## More Subset Pattern Examples

```text
Document        | Embedded Subset          | Full Collection
----------------|--------------------------|------------------
Blog post       | Last 5 comments          | comments collection
User profile    | 10 recent activity items | activityLogs collection
Order history   | Last 3 orders            | orders collection
Chat channel    | Last 50 messages         | messages collection
```

## Choosing Subset Size

The subset size depends on your UI's default view:
- If the page shows the top 5, embed 5-10 (slightly more for freshness buffer)
- If the page shows 20, embed 20-25
- Err toward slightly more than needed to handle edge cases

```javascript
// Configuration-driven subset size
const REVIEW_SUBSET_SIZE = 10;

await db.products.updateOne(
  { _id: productId },
  {
    $push: {
      recentReviews: {
        $each: [newReview],
        $sort: { createdAt: -1 },
        $slice: REVIEW_SUBSET_SIZE
      }
    }
  }
);
```

## Summary

The subset pattern keeps a small, frequently accessed portion of data embedded in the parent document for fast access, while the full dataset lives in a separate collection for complete queries. This reduces document size, keeps working set small in memory, and dramatically speeds up the most common read path. Maintain the subset on every write using `$push` with `$slice` and `$sort`, and use the full collection only when users need to browse beyond the embedded subset.
