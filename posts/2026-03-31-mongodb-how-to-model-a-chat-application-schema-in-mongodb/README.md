# How to Model a Chat Application Schema in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, Chat Application, Schema Design, Real-Time

Description: Learn how to design an efficient MongoDB schema for a real-time chat application, covering channels, messages, users, and read receipts.

---

## Chat Application Data Model Overview

A chat application typically involves:
- Users (participants)
- Channels or conversations (direct messages, group chats)
- Messages (the content)
- Read receipts (who has seen what)

MongoDB's document model is well-suited for chat because conversations and messages have natural hierarchy, and workloads are read-heavy with burst writes.

## Users Collection

```javascript
// users collection
{
  _id: ObjectId("u001"),
  username: "alice",
  displayName: "Alice Smith",
  avatarUrl: "https://cdn.example.com/alice.jpg",
  status: "online",               // online | offline | away
  lastSeenAt: ISODate("2026-03-31T09:00:00Z"),
  createdAt: ISODate("2026-01-01T00:00:00Z")
}
```

Indexes:
```javascript
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ status: 1 })
```

## Channels Collection

A channel represents a conversation (DM or group):

```javascript
// channels collection
{
  _id: ObjectId("ch001"),
  type: "group",                  // "direct" | "group"
  name: "Engineering Team",       // null for direct messages
  avatarUrl: "https://cdn.example.com/eng-team.jpg",
  memberIds: [
    ObjectId("u001"),
    ObjectId("u002"),
    ObjectId("u003")
  ],
  lastMessage: {
    text: "Has anyone reviewed the PR?",
    senderId: ObjectId("u002"),
    sentAt: ISODate("2026-03-31T09:15:00Z")
  },
  createdAt: ISODate("2026-02-01T00:00:00Z"),
  updatedAt: ISODate("2026-03-31T09:15:00Z")
}
```

The `lastMessage` embed (subset/extended reference pattern) enables listing conversations without querying messages:

```javascript
db.channels.createIndex({ memberIds: 1, updatedAt: -1 })
db.channels.createIndex({ type: 1 })
```

Get all channels for a user (ordered by most recent activity):

```javascript
db.channels.find({ memberIds: ObjectId("u001") }).sort({ updatedAt: -1 }).limit(20)
```

## Messages Collection

Store each message as a separate document (parent-reference pattern):

```javascript
// messages collection
{
  _id: ObjectId("m001"),
  channelId: ObjectId("ch001"),
  senderId: ObjectId("u002"),
  text: "Has anyone reviewed the PR?",
  attachments: [
    {
      type: "image",
      url: "https://cdn.example.com/screenshot.png",
      filename: "screenshot.png",
      sizeBytes: 45231
    }
  ],
  replyTo: null,                   // ObjectId of parent message for threads
  reactions: [
    { emoji: "thumbsup", userIds: [ObjectId("u001"), ObjectId("u003")] }
  ],
  editedAt: null,
  deletedAt: null,
  sentAt: ISODate("2026-03-31T09:15:00Z")
}
```

Indexes:
```javascript
db.messages.createIndex({ channelId: 1, sentAt: -1 })
db.messages.createIndex({ senderId: 1, sentAt: -1 })
db.messages.createIndex({ channelId: 1, replyTo: 1 })
```

Load messages for a channel (paginated):

```javascript
db.messages.find({ channelId: ObjectId("ch001"), deletedAt: null })
  .sort({ sentAt: -1 })
  .limit(50)
```

## Read Receipts

Track which messages each member has read:

```javascript
// readReceipts collection
{
  _id: ObjectId("r001"),
  channelId: ObjectId("ch001"),
  userId: ObjectId("u001"),
  lastReadMessageId: ObjectId("m001"),
  lastReadAt: ISODate("2026-03-31T09:16:00Z")
}
```

Index:
```javascript
db.readReceipts.createIndex({ channelId: 1, userId: 1 }, { unique: true })
```

Update read receipt when user reads messages:

```javascript
db.readReceipts.updateOne(
  { channelId: ObjectId("ch001"), userId: ObjectId("u001") },
  {
    $set: {
      lastReadMessageId: ObjectId("m001"),
      lastReadAt: new Date()
    }
  },
  { upsert: true }
)
```

## Counting Unread Messages

```javascript
// Find channels with unread messages for user
db.readReceipts.aggregate([
  { $match: { userId: ObjectId("u001") } },
  {
    $lookup: {
      from: "messages",
      let: { channelId: "$channelId", lastRead: "$lastReadAt" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$channelId", "$$channelId"] },
                { $gt: ["$sentAt", "$$lastRead"] },
                { $ne: ["$senderId", ObjectId("u001")] }
              ]
            }
          }
        },
        { $count: "unread" }
      ],
      as: "unreadInfo"
    }
  },
  { $project: { channelId: 1, unread: { $ifNull: [{ $arrayElemAt: ["$unreadInfo.unread", 0] }, 0] } } }
])
```

## Sending a Message (Transactional Flow)

```javascript
async function sendMessage(channelId, senderId, text) {
  const session = db.getMongo().startSession();
  session.startTransaction();

  try {
    const messageDoc = {
      channelId: ObjectId(channelId),
      senderId: ObjectId(senderId),
      text,
      attachments: [],
      replyTo: null,
      reactions: [],
      sentAt: new Date()
    };

    const result = await db.messages.insertOne(messageDoc, { session });

    // Update channel's lastMessage (subset pattern)
    await db.channels.updateOne(
      { _id: ObjectId(channelId) },
      {
        $set: {
          lastMessage: { text, senderId: ObjectId(senderId), sentAt: new Date() },
          updatedAt: new Date()
        }
      },
      { session }
    );

    await session.commitTransaction();
    return result.insertedId;
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}
```

## Summary

Model a chat application in MongoDB using a `users` collection for participant data, a `channels` collection with embedded `lastMessage` for conversation lists, a `messages` collection with parent-reference to channels for the full message history, and a `readReceipts` collection for tracking read state per user per channel. Index on `(channelId, sentAt)` for efficient message pagination and `(memberIds, updatedAt)` for conversation list queries. Use the subset pattern to embed `lastMessage` in channels, avoiding a join on every conversation list load.
