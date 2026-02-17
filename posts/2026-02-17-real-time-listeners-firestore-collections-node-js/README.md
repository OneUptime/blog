# How to Perform Real-Time Listeners on Firestore Collections Using the google-cloud/firestore Node.js Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, Node.js, Real-Time, Google Cloud

Description: Learn how to set up real-time listeners on Firestore collections in Node.js using the google-cloud/firestore library for live data synchronization.

---

One of the most compelling reasons to use Firestore is its built-in support for real-time data synchronization. Instead of polling your database every few seconds to check for changes, you can register snapshot listeners that fire whenever documents in a collection are created, updated, or deleted. This is incredibly useful for building dashboards, chat applications, notification systems, and anything else that benefits from live updates.

In this guide, I will walk you through setting up real-time listeners on Firestore collections using the `@google-cloud/firestore` Node.js library. We will cover basic listeners, filtered queries, error handling, and cleaning up listeners when they are no longer needed.

## Prerequisites

Before we start, make sure you have the following:

- A GCP project with Firestore enabled (Native mode)
- Node.js 18 or later installed
- A service account key or Application Default Credentials configured

## Setting Up the Project

Start by initializing a new Node.js project and installing the Firestore library.

```bash
# Create a new project directory and initialize it
mkdir firestore-realtime && cd firestore-realtime
npm init -y
npm install @google-cloud/firestore
```

## Initializing the Firestore Client

Create a file called `listener.js` and initialize the Firestore client.

```javascript
// listener.js - Initialize Firestore with your project ID
const { Firestore } = require('@google-cloud/firestore');

const firestore = new Firestore({
  projectId: 'your-gcp-project-id',
  // If running locally, point to your service account key
  // keyFilename: './service-account-key.json',
});
```

If you are running on a GCP service like Cloud Run or Compute Engine, the library will automatically pick up credentials from the environment. When running locally, you can either set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable or pass the `keyFilename` option.

## Listening to an Entire Collection

The simplest form of a real-time listener watches every document in a collection. The `onSnapshot` method takes a callback that receives a `QuerySnapshot` every time something changes.

```javascript
// Listen to all documents in the 'orders' collection
const collectionRef = firestore.collection('orders');

const unsubscribe = collectionRef.onSnapshot(
  (snapshot) => {
    // snapshot.docChanges() gives us only the documents that changed
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        console.log('New order:', change.doc.id, change.doc.data());
      }
      if (change.type === 'modified') {
        console.log('Updated order:', change.doc.id, change.doc.data());
      }
      if (change.type === 'removed') {
        console.log('Removed order:', change.doc.id, change.doc.data());
      }
    });
  },
  (error) => {
    // This callback fires if the listener encounters an error
    console.error('Listener error:', error);
  }
);
```

The `onSnapshot` method returns an unsubscribe function. Call it when you want to stop listening.

## Listening to Filtered Queries

In most production applications, you do not want to listen to every single document. You can chain query methods before calling `onSnapshot` to narrow down results.

```javascript
// Listen only to orders with status 'pending' from the last 24 hours
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

const filteredRef = firestore
  .collection('orders')
  .where('status', '==', 'pending')
  .where('createdAt', '>=', oneDayAgo)
  .orderBy('createdAt', 'desc');

const unsubscribeFiltered = filteredRef.onSnapshot((snapshot) => {
  console.log(`Currently ${snapshot.size} pending orders`);

  snapshot.docChanges().forEach((change) => {
    const data = change.doc.data();
    console.log(`[${change.type}] Order ${change.doc.id}: $${data.amount}`);
  });
});
```

Keep in mind that Firestore requires composite indexes for certain query combinations. If your query needs an index that does not exist yet, Firestore will throw an error with a direct link to create the index in the console.

## Handling the Initial Snapshot

When a listener first connects, it receives an initial snapshot containing all documents that match the query at that point in time. Every document appears as an `added` change. This is worth knowing because your logic should differentiate between the initial load and subsequent real-time updates.

```javascript
// Track whether we have received the initial snapshot
let isInitialLoad = true;

const unsubscribe = firestore.collection('orders').onSnapshot((snapshot) => {
  if (isInitialLoad) {
    console.log(`Initial load: ${snapshot.size} documents`);
    isInitialLoad = false;

    // Process the full initial dataset
    snapshot.docs.forEach((doc) => {
      console.log('Existing order:', doc.id);
    });
    return;
  }

  // After initial load, only process changes
  snapshot.docChanges().forEach((change) => {
    console.log(`Real-time ${change.type}:`, change.doc.id);
  });
});
```

## Error Handling and Reconnection

Firestore listeners automatically handle temporary network interruptions. When the connection drops, the library will attempt to reconnect and replay any missed changes. However, some errors are permanent - for example, if the user's permissions change or the collection is deleted.

```javascript
// Robust listener with error handling
function startListener() {
  const unsubscribe = firestore.collection('orders').onSnapshot(
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        processChange(change);
      });
    },
    (error) => {
      console.error('Listener failed:', error.code, error.message);

      // For permission errors, do not retry
      if (error.code === 7) {
        console.error('Permission denied. Check your Firestore rules.');
        return;
      }

      // For other errors, restart the listener after a delay
      console.log('Restarting listener in 5 seconds...');
      setTimeout(() => {
        startListener();
      }, 5000);
    }
  );

  return unsubscribe;
}

function processChange(change) {
  const data = change.doc.data();
  // Your business logic here
  console.log(`Processing ${change.type} for ${change.doc.id}`);
}
```

## Cleaning Up Listeners

Failing to unsubscribe from listeners is a common source of memory leaks. This is especially important in long-running Node.js services where listeners are created per request or per user session.

```javascript
// Store all active listeners for cleanup
const activeListeners = new Map();

function addListener(userId) {
  // Remove existing listener for this user if any
  removeListener(userId);

  const unsubscribe = firestore
    .collection('notifications')
    .where('userId', '==', userId)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          sendNotification(userId, change.doc.data());
        }
      });
    });

  activeListeners.set(userId, unsubscribe);
}

function removeListener(userId) {
  const unsubscribe = activeListeners.get(userId);
  if (unsubscribe) {
    // Call the unsubscribe function to stop the listener
    unsubscribe();
    activeListeners.delete(userId);
    console.log(`Removed listener for user ${userId}`);
  }
}

// Clean up all listeners on process shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down, removing all listeners...');
  activeListeners.forEach((unsubscribe, userId) => {
    unsubscribe();
    console.log(`Cleaned up listener for ${userId}`);
  });
  process.exit(0);
});
```

## Listening to a Single Document

Sometimes you only need to watch a single document rather than a whole collection. The API is identical.

```javascript
// Watch a specific order document for changes
const orderRef = firestore.doc('orders/order-12345');

const unsubscribe = orderRef.onSnapshot((docSnapshot) => {
  if (docSnapshot.exists) {
    console.log('Order data:', docSnapshot.data());
  } else {
    console.log('Order document does not exist');
  }
});
```

## Performance Considerations

There are a few things to keep in mind when using Firestore listeners in production:

- Each active listener maintains an open gRPC stream to Firestore. If you are running hundreds of listeners, you will use significant memory and network resources.
- Firestore charges for document reads on listener connections. Every document in the initial snapshot counts as a read, and every changed document in subsequent updates counts as a read.
- On Cloud Run, keep in mind that instances can be shut down at any time. You need proper SIGTERM handling to clean up listeners.
- Consider using Pub/Sub or Firestore triggers (Cloud Functions) instead of direct listeners if you need to fan out updates to many consumers.

## Putting It All Together

Here is a complete example that sets up a filtered listener, processes changes, and handles cleanup.

```javascript
const { Firestore } = require('@google-cloud/firestore');

const firestore = new Firestore({ projectId: 'your-project-id' });

function watchPendingOrders() {
  const query = firestore
    .collection('orders')
    .where('status', 'in', ['pending', 'processing'])
    .orderBy('createdAt', 'desc')
    .limit(100);

  return query.onSnapshot(
    (snapshot) => {
      const changes = snapshot.docChanges();
      console.log(`Received ${changes.length} changes`);

      changes.forEach((change) => {
        const order = { id: change.doc.id, ...change.doc.data() };
        switch (change.type) {
          case 'added':
            console.log('New order to process:', order.id);
            break;
          case 'modified':
            console.log('Order updated:', order.id, 'Status:', order.status);
            break;
          case 'removed':
            console.log('Order no longer pending:', order.id);
            break;
        }
      });
    },
    (error) => {
      console.error('Watch failed:', error);
    }
  );
}

const unsubscribe = watchPendingOrders();

// Graceful shutdown
process.on('SIGTERM', () => {
  unsubscribe();
  process.exit(0);
});
```

Real-time listeners are one of the strongest features Firestore offers, and using them from Node.js with the `@google-cloud/firestore` library is straightforward once you understand the basics. Just remember to handle your initial snapshots properly, manage your listener lifecycle, and clean up when your process shuts down.
