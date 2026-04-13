# How to Set Up MongoDB with Multiple Data Centers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Multi-Region, High Availability, Disaster Recovery

Description: Learn how to configure MongoDB replica sets across multiple data centers for geographic redundancy, disaster recovery, and low-latency reads near users.

---

## Why Multiple Data Centers

Running MongoDB across multiple data centers provides:
- **Disaster recovery** - survive a complete data center outage
- **Geographic redundancy** - tolerate network partitions between regions
- **Low-latency reads** - serve reads from the closest data center
- **Compliance** - keep data residency in specific regions

## Planning Your Replica Set Topology

A common multi-data-center setup uses a 5-member replica set distributed as:

```text
Data Center A (Primary Region):
  - member0: primary (priority 2, votes 1)
  - member1: secondary (priority 1, votes 1)

Data Center B (Secondary Region):
  - member2: secondary (priority 1, votes 1)
  - member3: secondary (priority 1, votes 1)

Data Center C (Arbiter/Tie-breaker):
  - member4: arbiter (priority 0, votes 1)
```

This ensures Data Center A always wins elections (highest priority) while DC B can take over if DC A fails completely.

## Initializing a Multi-Data-Center Replica Set

```javascript
// Connect to the primary candidate and initiate the replica set
rs.initiate({
  _id: "rs0",
  members: [
    {
      _id: 0,
      host: "dc-a-mongo1.example.com:27017",
      priority: 2,
      votes: 1,
      tags: { dc: "us-east", rack: "rack1" }
    },
    {
      _id: 1,
      host: "dc-a-mongo2.example.com:27017",
      priority: 1,
      votes: 1,
      tags: { dc: "us-east", rack: "rack2" }
    },
    {
      _id: 2,
      host: "dc-b-mongo1.example.com:27017",
      priority: 1,
      votes: 1,
      tags: { dc: "us-west", rack: "rack1" }
    },
    {
      _id: 3,
      host: "dc-b-mongo2.example.com:27017",
      priority: 1,
      votes: 1,
      tags: { dc: "us-west", rack: "rack2" }
    },
    {
      _id: 4,
      host: "dc-c-arbiter.example.com:27017",
      arbiterOnly: true,
      tags: { dc: "us-central" }
    }
  ]
});
```

## Configuring Write Concern for Multi-DC Durability

Use write concern with custom write concern rules to ensure writes are acknowledged by multiple data centers before returning success:

```javascript
// Define custom write concern rules in replica set config
rs.reconfig({
  _id: "rs0",
  version: 2,
  settings: {
    getLastErrorModes: {
      // Requires acknowledgment from at least one member in each DC
      "multiDC": { "dc": 2 },
      // Requires acknowledgment from both racks within a DC
      "multiRack": { "rack": 2 }
    }
  },
  members: [ /* ... same members ... */ ]
});

// Use the custom write concern in application code
const db = client.db('mydb');
await db.collection('orders').insertOne(
  { orderId: '123', amount: 99.99 },
  { writeConcern: { w: 'multiDC', wtimeout: 5000 } }
);
```

## Configuring Read Preference with Tag Sets

Tag sets allow routing reads to specific data centers:

```javascript
const { MongoClient, ReadPreference } = require('mongodb');

const client = new MongoClient(
  'mongodb://dc-a-mongo1.example.com:27017,dc-a-mongo2.example.com:27017,' +
  'dc-b-mongo1.example.com:27017,dc-b-mongo2.example.com:27017/?replicaSet=rs0'
);

const db = client.db('mydb');

// Read from US East DC when possible, fall back to any secondary
const usEastRead = new ReadPreference('secondary', [
  { dc: 'us-east' },
  {}  // empty tag set means any member
]);

const users = await db.collection('users').find({}).withReadPreference(usEastRead).toArray();

// Read from US West DC
const usWestRead = new ReadPreference('secondary', [
  { dc: 'us-west' },
  {}
]);
```

## mongod.conf for Each Data Center

```yaml
# mongod.conf for Data Center A members
replication:
  replSetName: "rs0"

net:
  port: 27017
  bindIp: 0.0.0.0
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb/server.pem
    CAFile: /etc/ssl/mongodb/ca.pem

storage:
  dbPath: /var/lib/mongodb
  wiredTiger:
    engineConfig:
      cacheSizeGB: 8
```

## Monitoring Cross-DC Replication Lag

Check replication lag between data centers:

```javascript
// Check replica set status and config (tags are in rs.conf(), not rs.status())
const status = rs.status();
const conf = rs.conf();

// Build a map of member host -> tags from the config
const tagMap = {};
conf.members.forEach(m => { tagMap[m.host] = m.tags || {}; });

status.members.forEach(member => {
  if (member.stateStr === 'SECONDARY') {
    const lagSecs = member.optimeDate
      ? (new Date() - member.optimeDate) / 1000
      : 'unknown';
    const dc = tagMap[member.name]?.dc || 'unknown';
    console.log(`${member.name}: lag=${lagSecs}s, dc=${dc}`);
  }
});
```

## Summary

A multi-data-center MongoDB deployment requires careful planning of replica set topology, member priorities, and voting members to ensure correct election behavior. Custom write concern modes with tag sets enforce durability across data centers, while tagged read preferences enable geographic routing of read traffic. Always use TLS for inter-DC communication and monitor replication lag to detect network issues between regions.
