# How to Initialize a Replica Set in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, High Availability, Configuration, Operation

Description: Step-by-step guide to initializing a MongoDB replica set from standalone mongod instances to enable high availability and automatic failover.

---

## Prerequisites

You need at least three MongoDB instances running on separate hosts (or ports for testing). Replica sets require an odd number of voting members to elect a primary via majority vote.

## Start mongod Instances with Replica Set Name

Each `mongod` must start with the `--replSet` flag specifying the same replica set name.

```bash
# Node 1
mongod --replSet myReplicaSet \
  --dbpath /data/db1 \
  --port 27017 \
  --bind_ip localhost,192.168.1.10 \
  --logpath /var/log/mongodb/node1.log \
  --fork

# Node 2
mongod --replSet myReplicaSet \
  --dbpath /data/db2 \
  --port 27018 \
  --bind_ip localhost,192.168.1.11 \
  --logpath /var/log/mongodb/node2.log \
  --fork

# Node 3
mongod --replSet myReplicaSet \
  --dbpath /data/db3 \
  --port 27019 \
  --bind_ip localhost,192.168.1.12 \
  --logpath /var/log/mongodb/node3.log \
  --fork
```

## Using a Configuration File

```yaml
# /etc/mongod.conf
replication:
  replSetName: "myReplicaSet"
net:
  port: 27017
  bindIp: "localhost,192.168.1.10"
storage:
  dbPath: /data/db
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
```

## Initialize the Replica Set

Connect to one node and run `rs.initiate()`:

```bash
mongosh --host 192.168.1.10 --port 27017
```

```javascript
rs.initiate({
  _id: "myReplicaSet",
  members: [
    { _id: 0, host: "192.168.1.10:27017" },
    { _id: 1, host: "192.168.1.11:27018" },
    { _id: 2, host: "192.168.1.12:27019" }
  ]
});
```

## Verify Initialization

Check the replica set status:

```javascript
rs.status()
```

Wait for one node to show `stateStr: "PRIMARY"` and the others to show `stateStr: "SECONDARY"`. This may take 30-60 seconds.

```javascript
// Check which node is primary
rs.isMaster()
// or in newer versions
db.hello()
```

## Connecting with Replica Set URI

Once initialized, connect using the replica set URI to get automatic failover:

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(
  "mongodb://192.168.1.10:27017,192.168.1.11:27018,192.168.1.12:27019/?replicaSet=myReplicaSet"
);
await client.connect();
```

## Summary

Initializing a MongoDB replica set requires starting each `mongod` with the same `--replSet` name, then calling `rs.initiate()` with the full member list from any one node. After a brief election, one node becomes primary and the others become secondaries. Always use an odd number of voting members and connect applications via the replica set URI to enable automatic failover.
