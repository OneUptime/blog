# How to Handle Split-Brain Scenarios in MongoDB Replica Sets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Split Brain, High Availability, Network Partition

Description: Learn how MongoDB prevents split-brain in replica sets through majority elections, and how to detect, recover from, and prevent network partition scenarios.

---

A split-brain occurs when a network partition divides a cluster into two isolated partitions, both believing they are the primary. MongoDB's majority election protocol is specifically designed to prevent this, but understanding how it works - and what to do when things go wrong - is critical for production deployments.

## How MongoDB Prevents Split-Brain

MongoDB uses a **majority-based election** system. A member can only become or remain primary if it can reach a majority of voting members. With a 3-node replica set (3 votes total), a majority is 2. If a network partition isolates the primary from the other 2 nodes, it loses majority and steps down:

```text
[mongo1 PRIMARY] | PARTITION | [mongo2 SECONDARY] [mongo3 SECONDARY]

- mongo1 can only see itself (1/3 votes) -> steps down
- mongo2 and mongo3 see each other (2/3 votes) -> elect a new primary
```

Result: only one partition has a primary and accepts writes.

## Detecting a Partition-Related Stepdown

The primary will log:

```text
Not primary anymore; replicaset status: ...
```

And `rs.status()` will show the former primary in `SECONDARY` or `RECOVERING` state.

## What Happens to In-Flight Writes?

Writes acknowledged only by the old primary (before it stepped down) with `w: 1` may be rolled back if the new primary has not replicated them. Check the rollback directory:

```bash
ls /var/lib/mongodb/rollback/
```

Rollback files contain documents that were lost during the failover.

## Recovering Rolled Back Documents

```bash
# Convert rollback BSON to JSON
bsondump /var/lib/mongodb/rollback/orders.bson > rolled_back_orders.json

# Inspect and re-apply as needed
mongoimport --collection=orders_recovery --file=rolled_back_orders.json
```

## Preventing Data Loss with Majority Write Concern

Using `w: "majority"` ensures a write is not acknowledged until a majority of members have it. If the primary fails, the new primary is guaranteed to have that write:

```javascript
await col.insertOne(doc, { writeConcern: { w: "majority", j: true } });
```

With `w: "majority"`, there are no rollbacks for acknowledged writes.

## Simulating a Partition for Testing

Use firewall rules to simulate a network partition in a test environment:

```bash
# Block traffic from mongo1 to mongo2 and mongo3
sudo iptables -A OUTPUT -d mongo2 -j DROP
sudo iptables -A OUTPUT -d mongo3 -j DROP
```

Check that mongo1 steps down:

```javascript
rs.status().myState  // should become 2 (SECONDARY) after stepping down
```

Restore connectivity:

```bash
sudo iptables -D OUTPUT -d mongo2 -j DROP
sudo iptables -D OUTPUT -d mongo3 -j DROP
```

## Network Partition Checklist

```text
1. Use w:majority write concern for all critical writes
2. Deploy an odd number of voting members (3, 5, or 7)
3. Spread voting members across failure domains (racks, AZs)
4. Set heartbeatTimeoutSecs appropriate for your network
5. Monitor rs.status() for members in RECOVERING or UNKNOWN state
6. Check the rollback directory after any unplanned failover
```

## Adjusting Election Timeout

Lower the election timeout for faster failover detection (at the cost of more false positives on slow networks):

```javascript
var cfg = rs.conf();
cfg.settings.electionTimeoutMillis = 5000;  // default is 10000
rs.reconfig(cfg);
```

## Summary

MongoDB's majority election protocol prevents true split-brain by ensuring only one partition with quorum can elect a primary. Protect against data loss by always using `w: "majority"` write concern. Deploy voting members across independent failure domains to ensure one partition always has a majority. After any unplanned failover, check the rollback directory for writes that were not replicated to the new primary.

