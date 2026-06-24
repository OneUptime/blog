# How to Implement Real-Time Collaboration with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Change Stream, WebSocket, Collaboration, Concurrency

Description: Learn how to build real-time collaborative document editing backed by MongoDB with operational transforms, presence tracking, and conflict resolution.

---

Real-time collaboration requires multiple clients to edit the same document simultaneously without conflicts. MongoDB serves as the persistent store while change streams notify all participants of updates. This guide covers a practical approach using last-write-wins with version tracking and user presence.

## Document Schema with Versioning

```javascript
const mongoose = require('mongoose');

const docSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: '' },
  version: { type: Number, default: 0 },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now },
});

const CollabDoc = mongoose.model('CollabDoc', docSchema);
```

## Presence Tracking Schema

Track which users are currently editing a document:

```javascript
const presenceSchema = new mongoose.Schema({
  docId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userName: String,
  cursorPosition: Number,
  color: String,
  lastSeen: { type: Date, default: Date.now },
});

// Auto-remove stale presence after 30 seconds
presenceSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 30 });

const Presence = mongoose.model('Presence', presenceSchema);
```

## Optimistic Update with Version Check

Apply updates only if the client's version matches the server:

```javascript
async function applyEdit(docId, userId, { content, clientVersion }) {
  const doc = await CollabDoc.findOneAndUpdate(
    { _id: docId, version: clientVersion },
    {
      $set: { content, lastEditedBy: userId, updatedAt: new Date() },
      $inc: { version: 1 },
    },
    { new: true }
  );

  if (!doc) {
    // Version conflict - return current document so client can rebase
    const current = await CollabDoc.findById(docId).lean();
    throw Object.assign(new Error('Version conflict'), { currentDoc: current });
  }

  return doc;
}
```

## Socket.io Room and Change Stream Integration

```javascript
const { Server } = require('socket.io');
const io = new Server(httpServer);

function watchDocument(docId) {
  const stream = CollabDoc.watch(
    [{ $match: { 'documentKey._id': new mongoose.Types.ObjectId(docId) } }],
    { fullDocument: 'updateLookup' }
  );

  stream.on('change', (change) => {
    if (['update', 'replace'].includes(change.operationType)) {
      const doc = change.fullDocument;
      io.to(`doc:${docId}`).emit('doc:changed', {
        content: doc.content,
        version: doc.version,
        lastEditedBy: doc.lastEditedBy?.toString(),
      });
    }
  });

  return stream;
}

const docStreams = new Map();

io.on('connection', (socket) => {
  socket.on('join:doc', async (docId) => {
    socket.join(`doc:${docId}`);

    if (!docStreams.has(docId)) {
      docStreams.set(docId, watchDocument(docId));
    }

    // Update presence
    await Presence.findOneAndUpdate(
      { docId, userId: socket.userId },
      { $set: { lastSeen: new Date(), userName: socket.userName } },
      { upsert: true }
    );

    // Broadcast presence to room
    const active = await Presence.find({ docId }).lean();
    io.to(`doc:${docId}`).emit('presence:update', active);
  });

  socket.on('edit:apply', async ({ docId, content, clientVersion }) => {
    try {
      await applyEdit(docId, socket.userId, { content, clientVersion });
      // Change stream will broadcast the update
    } catch (err) {
      if (err.currentDoc) {
        socket.emit('edit:conflict', err.currentDoc);
      }
    }
  });

  socket.on('cursor:move', ({ docId, position }) => {
    socket.to(`doc:${docId}`).emit('cursor:update', {
      userId: socket.userId,
      position,
    });
  });
});
```

## Querying Collaboration History

```javascript
// Find all documents a user has collaborated on
db.collabdocs.find({ collaborators: ObjectId("<userId>") })

// Find active collaborators (seen in last 60 seconds)
db.presences.find({
  docId: ObjectId("<docId>"),
  lastSeen: { $gt: new Date(Date.now() - 60000) }
})
```

## Summary

Real-time collaboration with MongoDB works best when you combine optimistic version checks for conflict detection, change streams for broadcasting updates, and a TTL-indexed presence collection for tracking active users. Reject edits when the client version does not match the server version and return the current state so the client can rebase its changes.
