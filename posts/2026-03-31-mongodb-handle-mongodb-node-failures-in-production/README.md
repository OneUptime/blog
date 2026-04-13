# How to Handle MongoDB Node Failures in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Failover, High Availability, Operation

Description: Learn how to detect, respond to, and recover from MongoDB node failures in production using replica sets, monitoring, and driver-level resilience patterns.

---

Node failures in a MongoDB replica set are inevitable in production. A well-prepared system detects failures quickly, elects a new primary automatically, and recovers the failed node without data loss or extended downtime.

## Understand How Replica Set Elections Work

When the primary becomes unavailable, secondary members hold an election to choose a new primary. The election completes within seconds if a majority of voting members are reachable.

```javascript
// Check current replica set status after a suspected failure
rs.status()

// Look for the member with stateStr: "PRIMARY"
// A member with stateStr: "RECOVERING" is still catching up
// A member with stateStr: "DOWN" has not been heard from
```

Ensure your replica set has an odd number of voting members (3, 5, or 7) to prevent a split-brain scenario where no majority can be reached.

## Configure Proper Heartbeat and Election Settings

Tune `heartbeatIntervalMillis` and `electionTimeoutMillis` to control how fast MongoDB detects a failure.

```javascript
rs.reconfig({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27017" },
    { _id: 2, host: "mongo3:27017" }
  ],
  settings: {
    heartbeatIntervalMillis: 2000,
    electionTimeoutMillis: 10000
  }
})
```

Lower values detect failures faster but generate more network traffic. The defaults (2s heartbeat, 10s election timeout) are appropriate for most production deployments.

## Enable Retryable Writes to Handle Failover Transparently

With retryable writes enabled, the MongoDB driver automatically retries a write that failed due to a primary election, making the failure invisible to your application.

```javascript
const client = new MongoClient(uri, {
  retryWrites: true,
  retryReads: true,
  serverSelectionTimeoutMS: 15000
});
```

Retryable writes work for single-document operations. Multi-document transactions require explicit retry logic.

## Implement Retry Logic for Transactions

For multi-document transactions, implement a retry loop that re-runs the entire transaction on a transient error.

```javascript
async function runTransactionWithRetry(fn, session) {
  let attempt = 0;
  while (attempt < 3) {
    try {
      session.startTransaction();
      await fn(session);
      await session.commitTransaction();
      return;
    } catch (err) {
      try {
        await session.abortTransaction();
      } catch (_) {
        // Abort may fail if the transaction was already ended by the server
      }
      if (err.hasErrorLabel("TransientTransactionError")) {
        attempt++;
        continue;
      }
      throw err;
    }
  }
  throw new Error("Transaction failed after 3 attempts");
}
```

## Monitor Node Health with Alerts

Set up monitoring to alert when a replica set member goes into a non-healthy state. Using the `serverStatus` command, you can poll each node.

```javascript
// Run on each node to check health
const status = await db.adminCommand({ serverStatus: 1 });
console.log({
  host: status.host,
  replicationState: status.repl?.ismaster ? "PRIMARY" : "SECONDARY",
  optime: status.repl?.optime,
  connections: status.connections.current
});
```

Integrate these checks into your observability platform and alert when `replicationState` changes unexpectedly.

## Recover a Failed Node

When a node comes back online after a failure, it rejoins the replica set automatically and begins syncing from the primary.

```bash
# Restart the mongod process on the recovered node
sudo systemctl start mongod

# Monitor resync progress from the primary
mongosh --eval "rs.status()" | grep -A5 "mongo3"
```

If the failed node has been down long enough that its oplog window has expired, you must perform an initial sync or restore from a backup.

## Summary

Handling MongoDB node failures in production requires a properly sized replica set with an odd number of voting members, tuned heartbeat and election timeout settings, and driver-level retryable writes. For transactions, implement a retry loop that checks for the `TransientTransactionError` label. Continuous monitoring of replica set member states with automated alerts ensures your team is notified before failures escalate into extended outages.
