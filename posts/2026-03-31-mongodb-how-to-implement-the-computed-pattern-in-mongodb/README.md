# How to Implement the Computed Pattern in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, Computed Pattern, Performance, Aggregation

Description: Learn how to implement the computed pattern in MongoDB to pre-calculate and store expensive derived values, reducing computation at query time.

---

## What Is the Computed Pattern?

The computed pattern pre-calculates and stores the result of expensive computations or aggregations in the document rather than computing them at query time. This trades write complexity for dramatically faster reads.

When a value is read frequently but computed infrequently (or predictably), storing it pre-computed is often the right trade-off.

## The Problem: Expensive Computations at Read Time

Consider a movie database where you need the average rating:

```javascript
// Without computed pattern - must aggregate reviews on every read
db.reviews.aggregate([
  { $match: { movieId: ObjectId("m001") } },
  { $group: { _id: "$movieId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } }
])
```

For a site with millions of page views, this aggregation runs millions of times per hour.

## The Solution: Store Pre-Computed Values

Add `avgRating`, `reviewCount`, and `totalRatingSum` directly to the movie document:

```javascript
{
  _id: ObjectId("m001"),
  title: "The Shawshank Redemption",
  year: 1994,
  genre: ["Drama"],
  // Pre-computed aggregations
  reviewCount: 15420,
  totalRatingSum: 138780,
  avgRating: 9.0,
  lastComputedAt: ISODate("2026-03-31T12:00:00Z")
}
```

Read the movie (no aggregation needed):

```javascript
db.movies.findOne({ _id: ObjectId("m001") }, { title: 1, avgRating: 1, reviewCount: 1 })
```

## Updating Pre-Computed Values on Write

When a review is submitted, update the movie's computed fields:

```javascript
async function submitReview(movieId, rating) {
  // Insert the review
  await db.reviews.insertOne({
    movieId: ObjectId(movieId),
    rating: rating,
    createdAt: new Date()
  });

  // Update pre-computed fields on the movie document
  await db.movies.updateOne(
    { _id: ObjectId(movieId) },
    {
      $inc: {
        reviewCount: 1,
        totalRatingSum: rating
      }
    }
  );

  // Recompute average (optional: compute in app code using updated values)
  const movie = await db.movies.findOne({ _id: ObjectId(movieId) });
  await db.movies.updateOne(
    { _id: ObjectId(movieId) },
    { $set: { avgRating: movie.totalRatingSum / movie.reviewCount } }
  );
}
```

## Batch Recomputation

For complex aggregations, recompute periodically via a background job:

```javascript
// Batch recomputation script (run hourly or daily)
const movies = db.movies.find({}).toArray();

movies.forEach(function(movie) {
  const result = db.reviews.aggregate([
    { $match: { movieId: movie._id } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
        totalRatingSum: { $sum: "$rating" }
      }
    }
  ]).toArray();

  if (result.length > 0) {
    db.movies.updateOne(
      { _id: movie._id },
      {
        $set: {
          avgRating: result[0].avgRating,
          reviewCount: result[0].reviewCount,
          totalRatingSum: result[0].totalRatingSum,
          lastComputedAt: new Date()
        }
      }
    );
  }
});
```

## Using Change Streams for Real-Time Updates

Trigger recomputation when reviews change using a change stream:

```javascript
const changeStream = db.reviews.watch(
  [{ $match: { operationType: { $in: ["insert", "update", "delete"] } } }],
  { fullDocument: "updateLookup", fullDocumentBeforeChange: "whenAvailable" }
);

changeStream.on("change", async (change) => {
  const movieId = change.fullDocument?.movieId || change.fullDocumentBeforeChange?.movieId;
  if (movieId) {
    await recomputeMovieStats(movieId);
  }
});
```

## More Use Cases

```text
Use Case                           | Computed Field
-----------------------------------|---------------------------
Blog post                          | commentCount, likeCount
E-commerce product                 | avgRating, totalSold
User profile                       | followerCount, postCount
Financial account                  | balance (running total)
Inventory item                     | quantityAvailable
```

## Computed Fields for Sorting

Pre-computed scores enable efficient sorting without runtime aggregation:

```javascript
db.products.createIndex({ popularityScore: -1 })

// Sort by popularity instantly (no computation at query time)
db.products.find({ category: "electronics" }).sort({ popularityScore: -1 }).limit(20)
```

## Summary

The computed pattern pre-calculates expensive derived values and stores them in the document, converting frequent read-time computations into efficient field reads. Update computed values either synchronously on every write (for low-write-volume data), via periodic batch jobs (for acceptable staleness), or via change streams (for near-real-time updates). This pattern dramatically reduces read latency and database load for high-traffic applications where aggregations would otherwise run continuously.
