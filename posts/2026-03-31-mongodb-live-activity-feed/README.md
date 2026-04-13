# How to Build a Live Activity Feed with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Activity Feed, Change Stream, Real-Time, Node

Description: Learn how to build a live activity feed with MongoDB using a fan-out-on-write pattern, TTL indexes, and change streams for real-time delivery.

---

An activity feed shows users a chronological stream of events - likes, follows, comments, and posts. MongoDB is a natural fit because its flexible document model can store heterogeneous activity types in a single collection, and change streams can push new activities to clients in real time.

## Activity Schema

Store all activity types in one collection with a `type` discriminator field:

```javascript
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  // Who triggered the activity
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // What type of activity
  type: {
    type: String,
    enum: ['post', 'like', 'follow', 'comment', 'share'],
    required: true,
    index: true,
  },
  // What was acted upon
  targetType: { type: String, enum: ['post', 'user', 'comment'] },
  targetId: { type: mongoose.Schema.Types.ObjectId, index: true },
  // Recipients (fan-out)
  recipientIds: [{ type: mongoose.Schema.Types.ObjectId, index: true }],
  // Flexible payload per type
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

// Auto-delete activities older than 90 days
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Compound index for feed queries
activitySchema.index({ recipientIds: 1, createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);
```

## Fan-Out on Write

When a user posts, create an activity document fanned out to all their followers:

```javascript
async function publishActivity({ actorId, type, targetType, targetId, metadata }) {
  // Get followers of the actor
  const follows = await Follow.find({ followeeId: actorId }).select('followerId').lean();
  const recipientIds = follows.map((f) => f.followerId);

  // Also include the actor for their own feed
  recipientIds.push(actorId);

  const activity = await Activity.create({
    actorId,
    type,
    targetType,
    targetId,
    recipientIds,
    metadata,
  });

  return activity;
}

// Usage: user creates a post
await publishActivity({
  actorId: userId,
  type: 'post',
  targetType: 'post',
  targetId: newPost._id,
  metadata: { title: newPost.title },
});
```

## Querying a User's Feed

```javascript
async function getUserFeed(userId, { limit = 20, before } = {}) {
  const query = { recipientIds: userId };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  return Activity.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('actorId', 'name picture')
    .lean();
}
```

## Real-Time Delivery with Change Streams

Push new activities to online users via Socket.io:

```javascript
function watchActivities(io) {
  const stream = Activity.watch(
    [{ $match: { operationType: 'insert' } }]
  );

  stream.on('change', (change) => {
    const activity = change.fullDocument;

    for (const recipientId of activity.recipientIds) {
      io.to(`user:${recipientId.toString()}`).emit('feed:activity', {
        id: activity._id.toString(),
        type: activity.type,
        actorId: activity.actorId.toString(),
        targetId: activity.targetId?.toString(),
        metadata: activity.metadata,
        createdAt: activity.createdAt,
      });
    }
  });
}
```

## Marking Activities as Read

```javascript
const readSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  lastReadAt: { type: Date, default: Date.now },
});

const FeedRead = mongoose.model('FeedRead', readSchema);

// Get unread count
async function getUnreadCount(userId) {
  const readRecord = await FeedRead.findOne({ userId }).lean();
  const since = readRecord?.lastReadAt ?? new Date(0);
  return Activity.countDocuments({ recipientIds: userId, createdAt: { $gt: since } });
}
```

## Aggregating Feed Statistics

```javascript
// Count activities by type for a user
db.activities.aggregate([
  { $match: { actorId: ObjectId("<userId>") } },
  { $group: { _id: "$type", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

## Summary

The fan-out-on-write pattern with MongoDB makes feed reads fast - each user's feed is a filtered query on a single indexed field. Use a TTL index to automatically prune old activities, compound index on `recipientIds` and `createdAt` for efficient pagination, and change streams to push new activities to connected clients in real time.
