# How to Set Up a 5-Node Replica Set in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, High Availability, Scalability, Configuration

Description: Configure a 5-node MongoDB replica set for increased read scalability and fault tolerance, allowing two node failures without losing write availability.

---

## Why Choose a 5-Node Replica Set

A 5-node replica set provides:
- Fault tolerance for up to 2 simultaneous node failures (majority = 3 out of 5)
- More read replicas for distributing query load
- Flexibility to designate nodes as hidden or delayed for analytics workloads
- With `w: majority`, only 3 of 5 nodes need to acknowledge writes, so the two extra nodes add read capacity without increasing the majority threshold proportionally

## Node Configuration

Follow the same `mongod.conf` structure on all five nodes:

```yaml
net:
  port: 27017
  bindIp: 0.0.0.0

storage:
  dbPath: /data/db
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4

replication:
  replSetName: "rs0"
  oplogSizeMB: 51200

security:
  keyFile: /etc/mongodb/keyfile
```

Generate and distribute the keyfile to all nodes:

```bash
openssl rand -base64 756 | tee /etc/mongodb/keyfile
chmod 400 /etc/mongodb/keyfile
chown mongodb:mongodb /etc/mongodb/keyfile
```

## Initialize with 5 Members

Connect to node1 and run:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "node1.example.com:27017", priority: 3 },
    { _id: 1, host: "node2.example.com:27017", priority: 2 },
    { _id: 2, host: "node3.example.com:27017", priority: 1 },
    { _id: 3, host: "node4.example.com:27017", priority: 1 },
    { _id: 4, host: "node5.example.com:27017", priority: 1 }
  ]
})
```

## Designate a Node for Analytics

You can configure one secondary as hidden with a delay for analytics or backup:

```javascript
var cfg = rs.conf()
cfg.members[4].hidden = true
cfg.members[4].priority = 0
cfg.members[4].secondaryDelaySecs = 3600
rs.reconfig(cfg)
```

This node will be 1 hour behind the primary, useful for point-in-time analysis without impacting production.

## Configure Read Preference for Secondaries

Distribute reads across all secondaries in your application:

```javascript
const { MongoClient, ReadPreference } = require("mongodb");

const client = new MongoClient(
  "mongodb://node1:27017,node2:27017,node3:27017,node4:27017,node5:27017/?replicaSet=rs0",
  {
    readPreference: ReadPreference.SECONDARY_PREFERRED,
  }
);
```

## Verify All Members

```javascript
rs.status().members.map(m => ({
  name: m.name,
  state: m.stateStr,
  health: m.health,
  optime: m.optimeDate
}))
```

## Test Failover

Stop two secondary nodes and verify the cluster maintains write availability:

```bash
sudo systemctl stop mongod  # on node3 and node4
```

The primary remains elected since 3 out of 5 members are still available (majority).

## Summary

A 5-node MongoDB replica set tolerates two simultaneous failures while maintaining write availability, since three remaining nodes still constitute a majority. Configuration follows the same pattern as a 3-node set but with five member entries in `rs.initiate()`. The additional nodes can be used for read scaling, analytics with hidden+delayed configuration, or geographic distribution. Use `rs.status()` to verify all members reach SECONDARY or PRIMARY state.
