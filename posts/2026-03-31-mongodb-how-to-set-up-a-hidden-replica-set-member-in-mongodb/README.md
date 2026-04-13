# How to Set Up a Hidden Replica Set Member in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Hidden Member, Backup, Operation

Description: Configure a hidden MongoDB replica set member for dedicated backup or analytics workloads without exposing it to application clients.

---

## What Is a Hidden Replica Set Member

A hidden member replicates data from the primary like a normal secondary but is invisible to drivers and clients. Applications using the replica set connection string will never receive the hidden member as a read target. This makes it ideal for backups, reporting, or ETL workloads that should not affect application performance.

Hidden members must have `priority: 0` so they can never become primary.

## Start the mongod for the Hidden Member

```bash
mongod --replSet myReplicaSet \
  --dbpath /data/db-hidden \
  --port 27021 \
  --bind_ip localhost,192.168.1.14 \
  --logpath /var/log/mongodb/hidden.log \
  --fork
```

## Configure the Hidden Member in the Replica Set

Connect to the primary and add the member with `hidden: true` and `priority: 0`:

```javascript
rs.add({
  host: "192.168.1.14:27021",
  hidden: true,
  priority: 0,
  votes: 1
});
```

Or, if the member was already added as a standard secondary, reconfigure it:

```javascript
const cfg = rs.conf();
const memberIndex = cfg.members.findIndex(
  m => m.host === "192.168.1.14:27021"
);
cfg.members[memberIndex].hidden = true;
cfg.members[memberIndex].priority = 0;
rs.reconfig(cfg);
```

## Verify the Hidden Configuration

```javascript
rs.conf().members.filter(m => m.hidden)
```

You should see the member with `hidden: true` and `priority: 0`.

## Connecting Directly to the Hidden Member

Even though clients cannot discover the hidden member automatically, you can connect to it directly for backup or analytics:

```javascript
// Direct connection to hidden member for analytics - bypasses replica set routing
const analyticsClient = new MongoClient("mongodb://192.168.1.14:27021/?directConnection=true");
```

Or via `mongodump` for backups:

```bash
mongodump \
  --host 192.168.1.14 \
  --port 27021 \
  --out /backup/$(date +%Y%m%d) \
  --authenticationDatabase admin \
  --username backupUser \
  --password secret
```

## Checking Replication Lag on the Hidden Member

Monitor how far behind the hidden member is from the primary:

```javascript
// Connect to primary and check
rs.printSecondaryReplicationInfo()
```

Or check the hidden member directly:

```javascript
// On the hidden member
rs.status().myState // Should be 2 (SECONDARY)
db.adminCommand({ replSetGetStatus: 1 }).optimes
```

## Summary

A hidden replica set member replicates all data but remains invisible to application drivers, making it perfect for backup and analytics workloads. Configure it with `hidden: true` and `priority: 0` so it never becomes primary. Connect directly to the hidden member's host for backup jobs or analytics queries without impacting application-facing members.
