# How to Set Up a Replica Set with Arbiter in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Arbiter, High Availability, Configuration

Description: Learn how to add an arbiter to a MongoDB replica set to maintain election quorum without the storage cost of a full data-bearing member.

---

## What is a MongoDB Arbiter

An arbiter is a replica set member that participates in elections but holds no data. It exists solely to provide a tie-breaking vote when the replica set has an even number of data-bearing members. A common use case is a 2-data-node + 1-arbiter topology, which provides automatic failover at lower infrastructure cost than three full data nodes.

## When to Use an Arbiter

Use an arbiter when:
- Infrastructure cost is a concern and you cannot afford three full data nodes
- You already have an even number of data nodes and need an odd total for elections
- The arbiter host is in a different availability zone to improve failure isolation

Note: Arbiters do not serve reads, cannot become primary, and do not contribute to write durability.

## Configure the Arbiter Node

The arbiter runs a standard `mongod` process but with minimal storage requirements. Install MongoDB on the arbiter host and configure:

```yaml
net:
  port: 27017
  bindIp: 0.0.0.0

storage:
  dbPath: /data/arb

replication:
  replSetName: "rs0"

security:
  keyFile: /etc/mongodb/keyfile
```

The arbiter must use the same keyfile as the other replica set members:

```bash
scp /etc/mongodb/keyfile arbiter.example.com:/etc/mongodb/keyfile
ssh arbiter.example.com "chmod 400 /etc/mongodb/keyfile && chown mongodb:mongodb /etc/mongodb/keyfile"
```

## Initialize the Replica Set Without Arbiter First

Start with the two data nodes:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "node1.example.com:27017", priority: 2 },
    { _id: 1, host: "node2.example.com:27017", priority: 1 }
  ]
})
```

## Add the Arbiter

After the primary is elected, add the arbiter using `rs.addArb()`:

```javascript
rs.addArb("arbiter.example.com:27017")
```

This is equivalent to:

```javascript
rs.add({ host: "arbiter.example.com:27017", arbiterOnly: true })
```

## Verify Arbiter Status

```javascript
rs.status().members.forEach(m => {
  print(`${m.name} - ${m.stateStr}`)
})
```

Expected output:

```text
node1.example.com:27017 - PRIMARY
node2.example.com:27017 - SECONDARY
arbiter.example.com:27017 - ARBITER
```

## Arbiter Limitations

The arbiter introduces some trade-offs:

```bash
# This will fail - arbiters cannot serve reads
mongosh --host arbiter.example.com --eval "db.collection.find()"
# Error: not primary or secondary; cannot currently read from this replSet member
```

```javascript
// Writes require majority - with 1 primary + 1 secondary, w:majority = 2
db.collection.insertOne(
  { test: true },
  { writeConcern: { w: "majority" } }
)
// Succeeds as long as both data nodes are alive
```

## Summary

A MongoDB arbiter enables automatic failover in a 2-data-node topology by providing the deciding vote during elections. Configure the arbiter with the same `replSetName` and keyfile as other members, then add it using `rs.addArb()`. Arbiters hold no data and cannot serve reads or become primary. This pattern reduces infrastructure cost compared to a 3-data-node replica set while maintaining high availability through election quorum.
