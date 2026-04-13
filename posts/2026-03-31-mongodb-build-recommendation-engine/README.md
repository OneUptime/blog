# How to Build a Recommendation Engine with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Recommendation Engine, Aggregation, Schema Design, Analytics

Description: Learn how to build a collaborative filtering recommendation engine with MongoDB using user interaction data and aggregation pipelines to generate personalized suggestions.

---

## Recommendation Strategies

MongoDB is well-suited for content-based and collaborative filtering recommendations. This guide uses a collaborative approach: recommend items that users with similar behavior have interacted with.

## Schema Design

```javascript
// User interaction events
{
  _id: ObjectId(),
  userId: ObjectId("64a1f8b2c9e7d3a5f8b2c9e7"),
  itemId: ObjectId("64b2a9c3d8f6e4b7a9c3d8f6"),
  eventType: "view",       // "view", "purchase", "like", "share"
  score: 1,                // weight: view=1, like=2, purchase=5
  createdAt: ISODate()
}

// Item catalog
{
  _id: ObjectId(),
  title: "MongoDB: The Definitive Guide",
  tags: ["mongodb", "database", "nosql"],
  category: "books"
}
```

## Creating Indexes

```javascript
async function setupRecommendationEngine(db) {
  await db.collection('interactions').createIndex({ userId: 1, itemId: 1 }, { unique: true });
  await db.collection('interactions').createIndex({ itemId: 1 });
  await db.collection('interactions').createIndex({ userId: 1, score: -1 });
  await db.collection('interactions').createIndex({ createdAt: 1 });
}
```

## Recording Interactions

```javascript
async function recordInteraction(db, { userId, itemId, eventType }) {
  const scoreMap = { view: 1, like: 2, purchase: 5, share: 3 };
  const score = scoreMap[eventType] || 1;

  await db.collection('interactions').updateOne(
    { userId, itemId },
    {
      $max: { score },   // keep the highest score for this user-item pair
      $set: { eventType, updatedAt: new Date() },
      $setOnInsert: { userId, itemId, createdAt: new Date() },
    },
    { upsert: true }
  );
}
```

## Item-Based Collaborative Filtering

Find items frequently co-interacted with items the target user has liked:

```javascript
async function getRecommendations(db, userId, limit = 10) {
  // Step 1: get items the user has already interacted with
  const userItems = await db.collection('interactions')
    .find({ userId })
    .project({ itemId: 1 })
    .toArray();

  const interactedIds = userItems.map((i) => i.itemId);

  // Step 2: aggregate - find other users who liked the same items,
  // then collect the other items those users interacted with
  const recommendations = await db.collection('interactions').aggregate([
    // Find users who interacted with the same items
    { $match: { itemId: { $in: interactedIds }, userId: { $ne: userId } } },

    // Group by other user, collect their items
    { $group: { _id: '$userId', items: { $addToSet: '$itemId' }, totalScore: { $sum: '$score' } } },

    // Sort by similarity score
    { $sort: { totalScore: -1 } },
    { $limit: 20 },

    // Unwind candidate items
    { $unwind: '$items' },

    // Exclude items the target user already saw
    { $match: { items: { $nin: interactedIds } } },

    // Score each candidate item by how many similar users interacted with it
    { $group: { _id: '$items', recommendationScore: { $sum: '$totalScore' } } },
    { $sort: { recommendationScore: -1 } },
    { $limit: limit },

    // Join with item catalog for full details
    { $lookup: { from: 'items', localField: '_id', foreignField: '_id', as: 'item' } },
    { $unwind: '$item' },
    { $project: { 'item.title': 1, 'item.category': 1, recommendationScore: 1 } },
  ]).toArray();

  return recommendations;
}
```

## Content-Based Fallback

For new users with no interaction history, fall back to popular items:

```javascript
async function getPopularItems(db, category, limit = 10) {
  return db.collection('interactions').aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 86400 * 1000) } } },
    { $group: { _id: '$itemId', totalScore: { $sum: '$score' }, views: { $sum: 1 } } },
    { $sort: { totalScore: -1 } },
    { $lookup: { from: 'items', localField: '_id', foreignField: '_id', as: 'item' } },
    { $unwind: '$item' },
    ...(category ? [{ $match: { 'item.category': category } }] : []),
    { $limit: limit },
    { $project: { 'item.title': 1, 'item.category': 1, totalScore: 1 } },
  ]).toArray();
}
```

## Summary

MongoDB's aggregation pipeline makes collaborative filtering accessible without a separate recommendation engine. Store interactions with weighted scores, use `$lookup` to join with item data, and use `$nin` to filter out already-seen items. For production scale, pre-compute and cache recommendations on a schedule using `$merge` or `$out` to store results in a dedicated collection.
