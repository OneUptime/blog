# How to Set Up Multi-Cloud MongoDB Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Multi-Cloud, Replica Set, High Availability, Infrastructure

Description: Learn how to deploy a MongoDB replica set across multiple cloud providers to achieve high availability, geographic redundancy, and avoid cloud vendor lock-in.

---

A multi-cloud MongoDB deployment spreads replica set members across AWS, GCP, Azure, or other providers. This protects against cloud-provider outages, reduces latency for geographically distributed users, and eliminates vendor lock-in.

## Architecture Overview

A standard multi-cloud replica set uses three members - one in each cloud - with an arbiter or a majority of voting members in one region to control elections predictably.

```text
AWS us-east-1  --> PRIMARY
GCP us-central1 --> SECONDARY
Azure eastus   --> SECONDARY (or ARBITER)
```

## Network Connectivity

All replica set members must communicate on port 27017 (or your configured port). Use a VPN mesh or dedicated cross-cloud interconnects:

```bash
# Example: WireGuard tunnel between AWS and GCP nodes
# On AWS node
wg set wg0 peer <GCP_PUBLIC_KEY> \
  allowed-ips 10.20.0.2/32 \
  endpoint <GCP_IP>:51820

# Verify connectivity
ping 10.20.0.2
```

Alternatively, use Atlas Multi-Cloud Clusters which handles the networking automatically.

## Initiate the Replica Set

Connect to the primary node and initiate with all three members:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "aws-node:27017", priority: 2 },
    { _id: 1, host: "gcp-node:27017", priority: 1 },
    { _id: 2, host: "azure-node:27017", priority: 1 }
  ]
})
```

Set a higher priority on the preferred primary to control which cloud hosts the primary under normal conditions.

## Configure Tag Sets for Read Routing

Use replica set tags to route read traffic to the geographically closest node:

```javascript
rs.reconfig({
  _id: "rs0",
  members: [
    { _id: 0, host: "aws-node:27017", priority: 2, tags: { cloud: "aws", region: "us-east-1" } },
    { _id: 1, host: "gcp-node:27017", priority: 1, tags: { cloud: "gcp", region: "us-central1" } },
    { _id: 2, host: "azure-node:27017", priority: 1, tags: { cloud: "azure", region: "eastus" } }
  ]
})
```

In your application, use a read preference that targets a specific tag:

```javascript
const client = new MongoClient(uri, {
  readPreference: ReadPreference.NEAREST,
  readPreferenceTags: [{ cloud: "gcp" }, {}]
})
```

## Latency Considerations

Cross-cloud replication adds write latency because the primary must acknowledge writes from members in remote clouds (when using `w: "majority"`). Measure round-trip time between clouds:

```bash
ping -c 10 gcp-node
```

For write-heavy workloads, keep the majority of voting members in one region to reduce latency on the critical path.

## Monitor Cross-Cloud Replication Lag

Track replication lag carefully in a multi-cloud setup:

```javascript
rs.printSecondaryReplicationInfo()
```

Set up alerts when replication lag exceeds your RPO threshold using a monitoring tool like OneUptime.

## Summary

Multi-cloud MongoDB deployments use replica sets spread across cloud providers connected via VPN or dedicated interconnects. Tag-based read preferences route queries to the nearest node, while priority settings control where the primary lives. Always monitor replication lag across clouds, and design your write concern to balance durability with acceptable write latency.
