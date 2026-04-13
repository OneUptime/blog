# How to End and Clean Up Sessions in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Session, Cleanup, Administration, Transaction

Description: Learn how to properly end MongoDB sessions in your application code and administratively kill sessions on the server to reclaim resources.

---

## Overview

Properly ending MongoDB sessions is essential for resource management. Each open session consumes memory on the server and holds state in `config.system.sessions`. Application-level sessions should always be ended after use, and administrators can kill sessions on the server when needed.

## Ending a Session in Application Code

Always end sessions in a `finally` block to guarantee cleanup even when errors occur:

```javascript
const session = client.startSession();
session.startTransaction();

try {
  // Perform operations with the session
  await db.collection('orders').insertOne(
    { item: 'Widget', qty: 5 },
    { session }
  );
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  // This always runs - session is ended regardless of success or failure
  await session.endSession();
}
```

## Checking Session State Before Ending

```javascript
// Check if a transaction is still open before ending
if (session.inTransaction()) {
  await session.abortTransaction();
}
await session.endSession();
```

## Mongoose Session Cleanup

In Mongoose, the pattern is the same:

```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  await Order.create([{ userId, items }], { session });
  await User.updateOne({ _id: userId }, { $inc: { orderCount: 1 } }, { session });
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

## What Happens When endSession() is Called

When you call `endSession()`:
1. The driver returns the underlying server session to its internal session pool for potential reuse.
2. When the session pool is full or the `MongoClient` is closed, the driver sends an `endSessions` command to the server.
3. The server marks the session as expired. The `LogicalSessionCacheRefresh` background task then removes it from the in-memory cache and from `config.system.sessions` on its next run.
4. Any open transaction associated with the session is automatically aborted.

## Server-Side Session Cleanup

MongoDB's `LogicalSessionCacheRefresh` background task runs every 5 minutes (controlled by `logicalSessionRefreshMillis`) and removes sessions that have expired (not refreshed within `localLogicalSessionTimeoutMinutes`, default 30 minutes). You can also manually trigger cleanup:

```javascript
// Kill all sessions for a specific user
db.adminCommand({
  killAllSessionsByPattern: [{ users: [{ user: 'alice', db: 'admin' }] }]
})

// Kill a specific session by its LSID
db.adminCommand({
  killSessions: [{ id: UUID('session-uuid-here') }]
})

// Kill all sessions (use with caution)
db.adminCommand({ killAllSessions: [] })
```

## Monitoring Sessions for Leaks

A growing `config.system.sessions` collection can indicate application-level session leaks:

```javascript
use config
// Check total session count
db.system.sessions.countDocuments()

// Find sessions not updated in the last hour (potentially leaked)
db.system.sessions.find({
  lastUse: { $lt: new Date(Date.now() - 60 * 60 * 1000) }
}).count()
```

If the count is large and growing, audit your application code for sessions that are created but never ended.

## Connection Pool Considerations

When using connection pooling, the driver manages a pool of sessions internally. When you call `endSession()`, the session may be returned to the driver's session pool for reuse rather than immediately closed on the server. This is a normal optimization - the server-side session remains active until it is either reused or expires.

## Setting Up Automated Cleanup Alerts

```javascript
// Script to alert on high session count
use config
const count = db.system.sessions.countDocuments();
if (count > 10000) {
  print(`ALERT: ${count} active sessions - possible session leak`);
}
```

## Summary

Properly ending MongoDB sessions requires calling `session.endSession()` in a `finally` block in application code. Always abort any open transaction before ending the session. Administratively, use `killSessions` or `killAllSessionsByPattern` to clean up leaked or abandoned sessions on the server. Monitor `config.system.sessions` collection size as a leading indicator of session leaks in your application.
