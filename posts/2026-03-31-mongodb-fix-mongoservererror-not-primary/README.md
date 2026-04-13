# How to Fix MongoServerError: Not Primary in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Error, Troubleshooting, High Availability

Description: Understand why MongoDB throws a 'not primary' error and learn how to fix it by correcting write routing, connection strings, and replica set configuration.

---

## What Causes "Not Primary"?

MongoDB replica sets consist of one primary and one or more secondaries. All write operations must go to the primary. The "not primary" error occurs when your application sends a write to a secondary node.

Common causes include:

- Your connection string points to a secondary directly (not the replica set URI).
- A recent failover promoted a new primary and your driver has not yet updated its topology.
- Your application uses `directConnection: true`, which bypasses replica set topology discovery and pins all operations to a single node.
- The previous primary stepped down and no new primary has been elected yet.

## Verifying Current Replica Set State

Connect to the cluster and check the current primary:

```javascript
rs.status();
```

Look for the member with `"stateStr": "PRIMARY"`. If no member is primary, the cluster is in the middle of an election.

## Using the Correct Connection String

Always use the full replica set connection string so the driver can discover and track the primary automatically:

```text
mongodb://host1:27017,host2:27017,host3:27017/?replicaSet=myReplicaSet
```

Do not connect directly to a single host without the `replicaSet` parameter - if that host is a secondary, all writes will fail.

## Configuring the Connection Correctly

In Node.js with the official driver:

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(
  "mongodb://host1:27017,host2:27017/?replicaSet=myReplicaSet",
  {
    writeConcern: { w: "majority" },
    readPreference: "primaryPreferred"
  }
);
```

Using `readPreference: "primaryPreferred"` ensures reads fall back to secondary when the primary is unavailable, but writes will still be directed to the primary.

## Handling Failover in Application Code

After a primary failover, the driver needs a moment to elect and discover the new primary. Implement retry logic with backoff:

```javascript
async function writeWithRetry(collection, doc, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await collection.insertOne(doc);
    } catch (err) {
      if (err.codeName === "NotWritablePrimary" && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, attempt * 500));
        continue;
      }
      throw err;
    }
  }
}
```

## Checking for Stale Secondary Connections

If you created a direct connection to a node that was once primary but is now secondary, close and recreate the client:

```javascript
// Check if the connected host is the primary
const adminDb = client.db("admin");
const hello = await adminDb.command({ hello: 1 });
console.log("Is Primary:", hello.isWritablePrimary);
```

If `hello.isWritablePrimary` is `false`, your connection is pointed at a secondary. Reconnect using the full replica set URI.

## When No Primary Is Available

If `rs.status()` shows no primary (all members are in SECONDARY or RECOVERING state), a primary election is in progress. The cluster needs a majority of voting members to elect a primary. Check:

```javascript
rs.status().members.forEach(m => {
  print(m.name, m.stateStr);
});
```

If fewer than a majority of nodes are reachable, add nodes or fix network partitions to restore quorum.

## Summary

The "not primary" error in MongoDB means a write was sent to a secondary. Fix it by using the full replica set URI, ensuring the driver is not configured with a read preference that excludes the primary for writes, and implementing retry logic to survive failover windows. Verify replica set state with `rs.status()` when troubleshooting.
