# How to Handle Offline-First Applications with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Realm, Offline-First, Mobile, Sync

Description: Learn how to build offline-first applications using the Realm SDK backed by MongoDB Atlas, with local persistence, sync on reconnect, and conflict resolution strategies.

---

> **Deprecation Notice (September 2024):** MongoDB deprecated Atlas Device Sync and the Atlas Device SDKs (formerly Realm) in September 2024, and the service was **shut down on September 30, 2025**. The Realm local database remains usable as an embedded database, but the cloud sync features described in this post are no longer operational. For offline-first applications going forward, consider alternatives such as building custom sync on top of MongoDB Change Streams, or third-party solutions like Parse, PowerSync, or Couchbase Lite.

## Overview

Offline-first applications write and read data locally at all times, treating network connectivity as an optional enhancement rather than a requirement. MongoDB Atlas Device Sync with the Realm SDK provides this capability: local Realm acts as the primary database, and Atlas is the sync target when the network is available.

## Core Principles of Offline-First Design

```text
1. Local-first reads: Always read from the local database, never block on network
2. Optimistic writes: Accept writes immediately, queue sync in the background
3. Conflict resolution: Define clear rules for resolving concurrent edits
4. Sync awareness: Show users sync status, not errors they cannot act on
```

## Schema Design for Offline-First

Design your data model to minimize conflicts by using additive operations:

```javascript
const TaskSchema = {
  name: 'Task',
  primaryKey: '_id',
  properties: {
    _id: 'objectId',
    title: 'string',
    ownerId: 'string',
    // Use append-only list for collaborative edits instead of shared string
    comments: 'string[]',
    // Track state per actor to avoid conflicts
    completedByUserId: 'string?',
    completedAt: 'date?',
    updatedAt: 'date',
  },
};
```

## Opening a Realm with Offline Fallback

Configure the Realm to open from local cache if the network is unavailable:

```javascript
import Realm from 'realm';

const app = new Realm.App({ id: 'YOUR-APP-ID' });

async function openRealm(user) {
  const config = {
    schema: [TaskSchema],
    sync: {
      user,
      flexible: true,
      newRealmFileBehavior: { type: 'downloadBeforeOpen', timeOut: 5000 },
      existingRealmFileBehavior: { type: 'openImmediately' },
      initialSubscriptions: {
        update(subs, realm) {
          subs.add(realm.objects('Task').filtered('ownerId == $0', user.id));
        },
      },
    },
  };

  // Opens immediately from cache if offline
  return Realm.open(config);
}
```

The `existingRealmFileBehavior: { type: 'openImmediately' }` setting ensures the app opens from the local Realm file without waiting for Atlas connectivity.

## Writing Data Optimistically

```javascript
function createTask(realm, user, title) {
  realm.write(() => {
    realm.create('Task', {
      _id: new Realm.BSON.ObjectId(),
      title,
      ownerId: user.id,
      updatedAt: new Date(),
    });
  });
  // Write succeeds immediately; sync happens in background
}
```

## Showing Sync Status in the UI

```javascript
import { useRealm } from '@realm/react';

function SyncStatusBar() {
  const realm = useRealm();
  const [isConnected, setIsConnected] = React.useState(true);

  React.useEffect(() => {
    const session = realm.syncSession;

    session.addConnectionNotification((newState) => {
      setIsConnected(newState === Realm.ConnectionState.Connected);
    });
  }, [realm]);

  return (
    <View>
      {!isConnected && <Text>Offline - changes will sync when reconnected</Text>}
    </View>
  );
}
```

## Handling Client Reset

If the local Realm diverges too far from Atlas (e.g., after a long offline period or a server rollback), Atlas triggers a client reset:

```javascript
const config = {
  sync: {
    user,
    flexible: true,
    clientReset: {
      mode: 'recoverOrDiscardUnsyncedChanges',
      onBefore: (realm) => {
        console.log('Client reset starting - backing up local data');
      },
      onAfter: (beforeRealm, afterRealm) => {
        console.log('Client reset complete - sync resumed');
      },
    },
  },
};
```

## Testing Offline Behavior

Simulate offline mode in development by blocking the sync connection:

```javascript
realm.syncSession?.pause();

// Make local writes
realm.write(() => { /* ... */ });

// Resume and verify sync
realm.syncSession?.resume();
```

## Best Practices

- Use `existingRealmFileBehavior: { type: 'openImmediately' }` in production so returning users never see a loading screen.
- Show a non-blocking offline indicator rather than error dialogs - users can continue working.
- Avoid shared mutable fields (like a single `status` field) that multiple users or devices can update simultaneously.
- Test client reset paths explicitly in your CI pipeline using Realm's test utilities.

## Summary

Offline-first MongoDB applications with the Realm SDK combine local persistence for zero-latency reads and writes with automatic background sync to Atlas when connected. Design schemas to minimize conflicts, configure `openImmediately` for returning users, and show sync status non-intrusively in your UI.
