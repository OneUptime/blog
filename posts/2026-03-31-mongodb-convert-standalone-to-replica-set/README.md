# How to Convert a Standalone MongoDB to a Replica Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Migration, Configuration, Deployment

Description: Convert an existing standalone MongoDB instance to a replica set with minimal downtime, enabling high availability and future scalability.

---

## Why Convert to a Replica Set

A standalone MongoDB instance has no automatic failover - if it crashes, your application is down until you manually restart it. Converting to a replica set provides:
- Automatic failover via elections
- Read scaling with secondary reads
- Prerequisites for horizontal sharding later

## Step 1: Back Up Your Data

Before any topology change, take a backup:

```bash
mongodump --host localhost --port 27017 \
  --username admin --password password \
  --authenticationDatabase admin \
  --out /backup/pre-replica-set
```

## Step 2: Update mongod.conf

Add the `replication` section to `/etc/mongod.conf`:

```yaml
net:
  port: 27017
  bindIp: 0.0.0.0

storage:
  dbPath: /data/db

replication:
  replSetName: "rs0"

security:
  authorization: enabled
  keyFile: /etc/mongodb/keyfile
```

If you plan to add more members, generate the keyfile now:

```bash
openssl rand -base64 756 > /etc/mongodb/keyfile
chmod 400 /etc/mongodb/keyfile
chown mongodb:mongodb /etc/mongodb/keyfile
```

## Step 3: Restart mongod

```bash
sudo systemctl restart mongod
```

The instance starts with replication configured but is not yet part of a replica set.

## Step 4: Initialize the Replica Set

Connect to the instance and initialize:

```javascript
mongosh --host localhost --port 27017 -u admin -p password --authenticationDatabase admin

rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "node1.example.com:27017" }
  ]
})
```

With a single member, this node immediately becomes the primary.

## Step 5: Update Connection Strings

Update your application connection strings to include the `replicaSet` parameter:

```javascript
// Before
const uri = "mongodb://node1.example.com:27017/mydb";

// After
const uri = "mongodb://node1.example.com:27017/mydb?replicaSet=rs0";
```

Or use the SRV format which handles replica set topology automatically:

```javascript
const uri = "mongodb+srv://admin:password@node1.example.com/mydb";
```

## Step 6: Add Additional Members (Optional but Recommended)

To gain the benefits of high availability, add two more nodes:

```javascript
rs.add("node2.example.com:27017")
rs.add("node3.example.com:27017")
```

Wait for sync to complete:

```javascript
rs.printSecondaryReplicationInfo()
// node2.example.com:27017: 0 secs (0 hrs) behind the primary
// node3.example.com:27017: 0 secs (0 hrs) behind the primary
```

## Verify the Conversion

```javascript
rs.status()
// Shows PRIMARY for this node and SECONDARY for added members
```

```javascript
db.hello()
// isWritablePrimary: true, setName: "rs0", hosts: [...]
```

## Summary

Converting a standalone MongoDB to a replica set requires adding a `replication.replSetName` entry to `mongod.conf`, restarting the process, and calling `rs.initiate()` with the node's hostname. The single-member replica set immediately becomes primary. Update application connection strings to include the `replicaSet` parameter, then add additional members to achieve true high availability. Always take a full backup before making topology changes.
