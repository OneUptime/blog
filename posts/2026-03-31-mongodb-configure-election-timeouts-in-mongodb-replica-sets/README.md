# How to Configure Election Timeouts in MongoDB Replica Sets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Election, Configuration, High Availability

Description: Learn how to configure MongoDB replica set election timeouts, heartbeat intervals, and priority settings to optimize failover speed and cluster stability.

---

MongoDB replica set elections determine how quickly a new primary is chosen when the current primary becomes unavailable. Configuring election timeouts, heartbeat intervals, and member priorities correctly balances fast failover against unnecessary elections caused by transient network blips.

## Understand the Election Process

When a secondary does not receive a heartbeat from the primary within `electionTimeoutMillis`, it considers the primary unavailable and calls for an election. The first secondary to call an election and receive votes from a majority of voting members becomes the new primary.

```javascript
// View current replica set configuration settings
const config = rs.conf();
console.log(config.settings);
// Output:
// {
//   heartbeatIntervalMillis: 2000,
//   electionTimeoutMillis: 10000,
//   catchUpTimeoutMillis: -1,
//   ...
// }
```

## Tune Election Timeout for Your Environment

The default `electionTimeoutMillis` is 10,000ms (10 seconds). Lower values speed up failover but increase the risk of spurious elections on slow networks.

```javascript
cfg = rs.conf();
cfg.settings.electionTimeoutMillis = 5000;   // 5 seconds - faster failover
cfg.settings.heartbeatIntervalMillis = 2000; // Keep at default
rs.reconfig(cfg);
```

For high-latency WAN deployments, increase the timeout to avoid elections triggered by network latency spikes.

```javascript
cfg = rs.conf();
cfg.settings.electionTimeoutMillis = 30000;  // 30 seconds for WAN deployments
rs.reconfig(cfg);
```

## Configure Member Priority to Control Election Outcomes

Set higher priority on members that should become primary. Members with priority 0 can never become primary.

```javascript
cfg = rs.conf();
cfg.members[0].priority = 10;  // Preferred primary - datacenter A
cfg.members[1].priority = 5;   // Backup primary - datacenter A
cfg.members[2].priority = 0;   // Hidden member in datacenter B - never primary
rs.reconfig(cfg);
```

## Set Votes to Control Which Members Participate in Elections

In larger replica sets, you may want some members to participate in replication without having a vote in elections.

```javascript
cfg = rs.conf();
// Member index 3 replicates data but does not vote
cfg.members[3].votes = 0;
cfg.members[3].priority = 0;
rs.reconfig(cfg);
```

MongoDB allows up to 7 voting members in a replica set and recommends an odd number to avoid tied elections. If you add a non-voting member, it does not affect the quorum calculation.

## Monitor Election Events in the Log

MongoDB logs election events at the `REPL` component. Filter logs to see election history.

```bash
# Filter mongod logs for election-related messages
grep -i "election" /var/log/mongodb/mongod.log | tail -20
```

```text
{"t":{"$date":"2026-03-31T10:15:00.123Z"},"s":"I","c":"REPL","id":21336,"ctx":"ReplCoordExtern","msg":"Starting an election"}
{"t":{"$date":"2026-03-31T10:15:01.456Z"},"s":"I","c":"REPL","id":21338,"ctx":"ReplCoordExtern","msg":"Election succeeded"}
```

## Verify Election Timeout via Connection String

You can also set the server selection timeout on the client side to match your election timeout, so your application waits long enough for a new primary to be elected.

```javascript
const client = new MongoClient(
  "mongodb://mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=rs0",
  {
    serverSelectionTimeoutMS: 15000  // Wait up to 15s for a primary
  }
);
```

Setting `serverSelectionTimeoutMS` higher than `electionTimeoutMillis` ensures your application does not fail before the new primary has been elected.

## Summary

Configuring election timeouts in MongoDB replica sets involves setting `electionTimeoutMillis` to balance failover speed against spurious elections, tuning `heartbeatIntervalMillis` for your network conditions, and using member priorities to control which nodes are preferred as primary. On the application side, align `serverSelectionTimeoutMS` with your election timeout so client operations wait long enough for a new primary to be elected before returning an error.
