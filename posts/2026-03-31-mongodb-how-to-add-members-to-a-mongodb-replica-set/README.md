# How to Add Members to a MongoDB Replica Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Scaling, Operation, High Availability

Description: Add new members to a running MongoDB replica set to scale read capacity or improve fault tolerance without disrupting existing operations.

---

## When to Add Replica Set Members

You add members to a replica set to increase read capacity (by routing reads to secondaries), improve availability (more members survive failures), or add a hidden member for backups or analytics.

## Start the New mongod Instance

Before adding a member to the replica set configuration, the new `mongod` must be running with the same replica set name.

```bash
mongod --replSet myReplicaSet \
  --dbpath /data/db4 \
  --port 27020 \
  --bind_ip localhost,192.168.1.13 \
  --logpath /var/log/mongodb/node4.log \
  --fork
```

Or via config file:

```yaml
replication:
  replSetName: "myReplicaSet"
net:
  port: 27020
  bindIp: "localhost,192.168.1.13"
storage:
  dbPath: /data/db4
```

## Add the Member Using rs.add()

Connect to the primary and add the new member:

```javascript
mongosh --host 192.168.1.10 --port 27017
```

```javascript
// Simple add - will be a standard secondary
rs.add("192.168.1.13:27020");
```

MongoDB initiates an initial sync from the primary to the new member automatically.

## Check Initial Sync Progress

Monitor the new member's sync progress via `rs.status()`:

```javascript
rs.status().members.find(m => m.name === "192.168.1.13:27020")
```

During initial sync, the member's state will be `STARTUP2`. It transitions to `SECONDARY` once sync completes.

## Add a Member with Custom Priority

To add a member that should never become primary (e.g., a dedicated analytics node):

```javascript
rs.add({
  host: "192.168.1.13:27020",
  priority: 0,
  votes: 1
});
```

## Add a Non-Voting Member

For clusters already at the maximum of 7 voting members, add non-voting members:

```javascript
rs.add({
  host: "192.168.1.14:27021",
  priority: 0,
  votes: 0
});
```

## Verify the New Configuration

After adding, confirm the member list reflects the change:

```javascript
rs.conf()
```

Look for the new member in the `members` array with the correct `host`, `priority`, and `votes` values. To check the member's current state, use `rs.status()` and look for `stateStr` (e.g., `SECONDARY` once sync completes).

## Initial Sync Considerations

Initial sync can take significant time for large datasets. To reduce primary load, configure the new member to sync from a secondary:

```javascript
// On the new node, set sync source
db.adminCommand({
  replSetSyncFrom: "192.168.1.11:27018"
});
```

## Summary

Adding a member to a MongoDB replica set requires starting a new `mongod` with the replica set name, then calling `rs.add()` from the primary. MongoDB handles initial sync automatically. Use priority and votes settings to control whether the new member can become primary and whether it counts toward election quorum.
