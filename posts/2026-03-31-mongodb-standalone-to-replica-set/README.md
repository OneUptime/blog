# How to Convert a Standalone MongoDB Instance to a Replica Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Migration, Administration, Database

Description: Learn how to convert a running standalone MongoDB instance to a replica set with minimal downtime, preserving all existing data and indexes.

---

Converting a standalone MongoDB instance to a replica set adds high availability without data migration. The process requires a brief restart but no data movement. This guide walks through the conversion on a single-node standalone and then adding additional members.

## Why Convert?

- Enable transactions (require replica set)
- Add high availability with secondaries
- Prerequisite for sharding (config servers must be replica sets)
- Enable change streams

## Step 1 - Choose a Replica Set Name

Pick a name (e.g., `rs0`) that you will use consistently. It cannot be changed later without a full resync.

## Step 2 - Back Up the Existing Data

Always back up before making infrastructure changes:

```bash
mongodump --out /backup/pre-replicaset-$(date +%Y%m%d)
```

## Step 3 - Update mongod.conf

Add the replication section to `/etc/mongod.conf`:

```yaml
replication:
  replSetName: "rs0"
```

If you want to explicitly bind to all interfaces:

```yaml
net:
  bindIp: 0.0.0.0
  port: 27017
replication:
  replSetName: "rs0"
```

## Step 4 - Restart mongod

```bash
sudo systemctl restart mongod
```

The instance starts but is not yet part of an active replica set. It will refuse writes until initialized.

## Step 5 - Initialize the Replica Set

Connect with mongosh:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017" }
  ]
})
```

Wait a few seconds, then verify:

```javascript
rs.status().myState  // 1 = PRIMARY
db.hello().isWritablePrimary  // true
```

All existing data and indexes are preserved. The instance is now a one-member replica set acting as primary.

## Step 6 - Add Secondary Members

Prepare each secondary server:

1. Install MongoDB (same version)
2. Configure `mongod.conf` with the same `replSetName`
3. Start `mongod` (with empty data directory)

Add them from the primary:

```javascript
rs.add("mongo2:27017")
rs.add("mongo3:27017")
```

Monitor initial sync:

```javascript
rs.status().members
```

The new members will show `STARTUP2` during initial sync, then transition to `SECONDARY`.

## Step 7 - Update Application Connection String

Update your application to use the replica set connection string:

```text
# Before (standalone)
mongodb://mongo1:27017/mydb

# After (replica set)
mongodb://mongo1:27017,mongo2:27017,mongo3:27017/mydb?replicaSet=rs0
```

Most drivers handle replica set discovery automatically once `replicaSet` is specified.

## Adding an Arbiter (Optional)

If you only have 2 data nodes and want an odd number of voters without a third data node:

```javascript
rs.addArb("mongo-arb:27017")
```

Arbiters vote in elections but hold no data.

## Verify Application Connectivity

```javascript
// Test from application perspective
db.adminCommand("hello")
```

Check that `isWritablePrimary: true` is present in the response.

## Common Issues

```text
MongoServerError: already initialized
```

`rs.initiate()` was run more than once. Check current state with `rs.status()`.

```text
connection refused on secondary
```

Verify mongod is running on the secondary and the port is open in the firewall.

## Summary

Converting a standalone MongoDB instance to a replica set requires only a config file change, a restart, and `rs.initiate()`. All existing data is preserved. After initialization, add secondary members and update your application connection string to include all hosts and the `replicaSet` parameter. The conversion enables transactions, change streams, and sets the foundation for sharding.

