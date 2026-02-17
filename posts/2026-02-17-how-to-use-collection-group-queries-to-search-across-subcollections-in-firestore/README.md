# How to Use Collection Group Queries to Search Across Subcollections in Firestore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, Collection Group Queries, Subcollections, Firebase

Description: Learn how to use Firestore collection group queries to search across all subcollections with the same name, enabling powerful cross-document queries.

---

One of the most common questions from developers new to Firestore is: "How do I query across all subcollections?" If you have messages stored as subcollections under different chat rooms, how do you find all messages from a specific user across every room? The answer is collection group queries.

A collection group query lets you search across all collections and subcollections that share the same name, regardless of where they live in your document hierarchy. It is one of Firestore's most powerful features, and it unlocks data access patterns that would otherwise require denormalization or complex client-side aggregation.

## The Problem

Consider a chat application where messages are stored as subcollections under room documents.

```
// Data structure with messages as subcollections
rooms/
  room-1/
    messages/
      msg-a: { text: "Hello", sender: "alice", timestamp: ... }
      msg-b: { text: "Hi there", sender: "bob", timestamp: ... }
  room-2/
    messages/
      msg-c: { text: "Anyone here?", sender: "alice", timestamp: ... }
      msg-d: { text: "Yes!", sender: "charlie", timestamp: ... }
  room-3/
    messages/
      msg-e: { text: "Good morning", sender: "alice", timestamp: ... }
```

Without collection group queries, to find all messages from Alice, you would have to query each room's messages subcollection individually. If you have 1,000 rooms, that is 1,000 separate queries. Not practical.

## Using Collection Group Queries

A collection group query targets all collections named "messages" across your entire database.

```javascript
// Query all messages from Alice across every room
// This searches every 'messages' subcollection in the database
import { collectionGroup, query, where, getDocs, orderBy } from 'firebase/firestore';

async function getAllMessagesByUser(userId) {
  const messagesQuery = query(
    collectionGroup(db, 'messages'),  // Targets ALL 'messages' collections
    where('sender', '==', userId),
    orderBy('timestamp', 'desc')
  );

  const snapshot = await getDocs(messagesQuery);
  const messages = snapshot.docs.map(doc => ({
    id: doc.id,
    path: doc.ref.path,  // Full path tells you which room this message is in
    ...doc.data()
  }));

  console.log(`Found ${messages.length} messages from ${userId}`);
  return messages;
}

const aliceMessages = await getAllMessagesByUser('alice');
```

The `doc.ref.path` is particularly useful - it gives you the full document path like `rooms/room-1/messages/msg-a`, so you can determine which parent document each result belongs to.

## Required Index

Collection group queries require a specific index. Firestore will not run the query without one. You can create the index in several ways.

The easiest way: just run the query and check the error message. Firestore will give you a direct link to create the required index.

Or define it in your `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "sender", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Deploy the index:

```bash
# Deploy indexes - this can take a few minutes to build
firebase deploy --only firestore:indexes
```

You can also create indexes through the gcloud CLI:

```bash
# Create a collection group index using gcloud
gcloud firestore indexes composite create \
  --collection-group=messages \
  --query-scope=COLLECTION_GROUP \
  --field-config=field-path=sender,order=ASCENDING \
  --field-config=field-path=timestamp,order=DESCENDING \
  --project=your-project-id
```

## Security Rules for Collection Group Queries

By default, security rules for subcollections only match direct access. For collection group queries to work, you need rules that use a wildcard path.

```javascript
// Security rules that allow collection group queries on messages
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // This rule only applies to direct subcollection access
    match /rooms/{roomId}/messages/{messageId} {
      allow read: if request.auth != null;
    }

    // This rule applies to collection group queries
    // The {path=**} wildcard matches messages at any depth
    match /{path=**}/messages/{messageId} {
      allow read: if request.auth != null;
    }
  }
}
```

The `{path=**}` wildcard is what makes collection group queries possible from a security standpoint. Without it, the query will be rejected.

## Real-Time Listeners with Collection Group Queries

Collection group queries work with real-time listeners too. You can listen to changes across all subcollections in real time.

```javascript
// Real-time listener across all messages subcollections
// Fires whenever any message in any room changes
import { collectionGroup, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

function listenToRecentMessages(callback) {
  const recentMessagesQuery = query(
    collectionGroup(db, 'messages'),
    orderBy('timestamp', 'desc'),
    limit(50)
  );

  const unsubscribe = onSnapshot(recentMessagesQuery, (snapshot) => {
    const messages = [];

    snapshot.docChanges().forEach((change) => {
      const message = {
        id: change.doc.id,
        roomPath: change.doc.ref.parent.parent.path,  // Get the parent room's path
        ...change.doc.data()
      };

      if (change.type === 'added') {
        messages.push(message);
      }
    });

    callback(messages);
  });

  return unsubscribe;
}

// Usage: listen for new messages across all rooms
const unsub = listenToRecentMessages((newMessages) => {
  console.log('New messages:', newMessages);
});
```

## Practical Use Cases

Collection group queries are useful in many scenarios beyond chat apps.

**Comments across posts**: If each blog post has a comments subcollection, you can find all comments by a specific user.

```javascript
// Find all comments by a specific user across all blog posts
async function getUserComments(userId) {
  const commentsQuery = query(
    collectionGroup(db, 'comments'),
    where('authorId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(commentsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    postId: doc.ref.parent.parent.id,  // Extract the parent post ID
    ...doc.data()
  }));
}
```

**Tasks across projects**: In a project management app, search for overdue tasks across all projects.

```javascript
// Find all overdue tasks across every project
import { Timestamp } from 'firebase/firestore';

async function getOverdueTasks() {
  const now = Timestamp.now();

  const tasksQuery = query(
    collectionGroup(db, 'tasks'),
    where('dueDate', '<', now),
    where('status', '!=', 'completed'),
    orderBy('dueDate')
  );

  const snapshot = await getDocs(tasksQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    projectId: doc.ref.parent.parent.id,
    ...doc.data()
  }));
}
```

**Reviews across products**: Aggregate reviews from all product subcollections.

```javascript
// Get the most recent reviews across all products
async function getLatestReviews(count = 20) {
  const reviewsQuery = query(
    collectionGroup(db, 'reviews'),
    orderBy('createdAt', 'desc'),
    limit(count)
  );

  const snapshot = await getDocs(reviewsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    productId: doc.ref.parent.parent.id,
    ...doc.data()
  }));
}
```

## Extracting Parent References

A common need with collection group query results is getting a reference to the parent document. Here is a helper function.

```javascript
// Helper to extract parent document references from collection group results
// Useful when you need to fetch the parent document for context
function getParentRef(docSnapshot) {
  // doc.ref.parent gives you the collection reference
  // doc.ref.parent.parent gives you the parent document reference
  return docSnapshot.ref.parent.parent;
}

async function getMessagesWithRoomDetails(userId) {
  const messagesQuery = query(
    collectionGroup(db, 'messages'),
    where('sender', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(20)
  );

  const snapshot = await getDocs(messagesQuery);

  // Fetch parent room details for each message
  const results = await Promise.all(
    snapshot.docs.map(async (msgDoc) => {
      const roomRef = getParentRef(msgDoc);
      const roomDoc = await getDoc(roomRef);

      return {
        message: { id: msgDoc.id, ...msgDoc.data() },
        room: roomDoc.exists() ? { id: roomDoc.id, ...roomDoc.data() } : null
      };
    })
  );

  return results;
}
```

## Performance Considerations

Collection group queries scan across all collections with the matching name. If you have a "messages" collection at the top level and "messages" subcollections under rooms, a collection group query will include both. Be aware of this when naming your collections.

Also, since collection group queries can potentially span a very large number of documents, always use appropriate `where` filters and `limit` clauses to keep the result set manageable. An unfiltered collection group query on a large dataset will be slow and expensive.

## Wrapping Up

Collection group queries eliminate one of the biggest pain points of working with Firestore's hierarchical data model. Instead of querying each subcollection individually, you can search across all of them in a single query. The main things to remember are: you need a collection group index, your security rules need the `{path=**}` wildcard, and the document's `ref.path` tells you where each result lives in the hierarchy. With these pieces in place, subcollections become just as queryable as top-level collections.
