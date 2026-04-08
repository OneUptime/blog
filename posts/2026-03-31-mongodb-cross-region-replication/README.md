# How to Set Up MongoDB Cross-Region Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replication, Replica Set, Region, Disaster Recovery

Description: Learn how to configure MongoDB cross-region replication by spreading replica set members across geographic regions for data redundancy and low-latency reads.

---

Cross-region replication in MongoDB extends a replica set across multiple geographic regions. This provides data redundancy against full-region outages, enables low-latency reads for distributed users, and supports compliance requirements for data residency.

## Topology Design

A common cross-region setup places two members in the primary region and one member in the DR region. This keeps write latency low (the primary only needs one ack from the co-located secondary) while maintaining redundancy:

```text
us-east-1: PRIMARY + SECONDARY (2 votes)
eu-west-1: SECONDARY (1 vote)
```

The primary region holds a majority of votes, so elections happen locally if the DR region is unreachable.

## Network Setup

Cross-region replica set members must reach each other over private networking. Use VPC peering or VPN tunnels between regions:

```bash
# AWS: Create VPC peering between us-east-1 and eu-west-1
aws ec2 create-vpc-peering-connection \
  --vpc-id vpc-us-east-1 \
  --peer-vpc-id vpc-eu-west-1 \
  --peer-region eu-west-1

# Accept the peering connection from the peer region
aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id pcx-12345678 \
  --region eu-west-1
```

## Configure the Replica Set

Initiate or reconfigure the replica set with members in both regions:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "10.0.1.10:27017", priority: 3 },
    { _id: 1, host: "10.0.1.11:27017", priority: 2 },
    { _id: 2, host: "10.1.1.10:27017", priority: 1 }
  ],
  settings: {
    catchUpTimeoutMillis: 2000
  }
})
```

Higher priority values in the primary region keep the primary local under normal conditions.

## Use Write Concern for Cross-Region Durability

For writes that must survive a region failure, use a custom write concern that requires acknowledgment from the DR region. First, configure a custom write concern mode on the replica set using `getLastErrorModes`:

```javascript
cfg = rs.conf()
cfg.settings.getLastErrorModes = {
  crossRegion: { region: 2 }
}
rs.reconfig(cfg)
```

This defines a write concern mode called `crossRegion` that requires acknowledgment from members spanning at least two distinct `region` tag values. Then use it in your writes:

```javascript
db.orders.insertOne(
  { orderId: "12345", amount: 99.99 },
  { writeConcern: { w: "crossRegion", j: true } }
)
```

Note that a standard `w: "majority"` write concern would not guarantee cross-region durability with this topology, because majority (2 of 3) can be satisfied by the primary and the co-located secondary without the DR region member ever confirming the write.

## Route Reads to the Nearest Region

Use tag sets and `nearest` read preference to route reads to the geographically closest member:

```javascript
rs.reconfig({
  _id: "rs0",
  members: [
    { _id: 0, host: "10.0.1.10:27017", priority: 3, tags: { region: "us-east-1" } },
    { _id: 1, host: "10.0.1.11:27017", priority: 2, tags: { region: "us-east-1" } },
    { _id: 2, host: "10.1.1.10:27017", priority: 1, tags: { region: "eu-west-1" } }
  ]
})
```

```javascript
const client = new MongoClient(uri, {
  readPreference: "nearest",
  readPreferenceTags: [{ region: "eu-west-1" }]
})
```

## Monitor Replication Lag

Cross-region replication lag is expected due to network latency. Monitor it and alert if it exceeds your RPO:

```javascript
rs.printSecondaryReplicationInfo()
```

Typical cross-region latency ranges from 10ms (same continent) to 100ms+ (intercontinental), which is usually acceptable for replication but should be baselined.

## Summary

MongoDB cross-region replication uses replica set topology to spread data across geographic regions. Place the majority of voting members in your primary region to keep elections local, use majority write concern for durability guarantees, and configure tag-based read preferences to route traffic to the nearest node. Monitor replication lag consistently to ensure it stays within your recovery objectives.
