# How to Add Non-Voting Members to a Replica Set in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Non-Voting Member, Scaling, Configuration

Description: Add non-voting members to a MongoDB replica set to scale reads and support analytics without affecting election outcomes or exceeding the 7-vote limit.

---

## What is a Non-Voting Member

MongoDB replica sets can have up to 50 members, but only 7 may have votes. Non-voting members (`votes: 0`) replicate all data and serve reads but do not participate in primary elections. They are ideal when you need more than 7 read replicas or when adding nodes purely for analytics without affecting failover behavior.

## When to Use Non-Voting Members

- You need more than 7 read-serving secondaries
- Adding analytics or reporting nodes without changing election topology
- Geographic replicas that should never become primary AND should not influence elections
- Backup nodes that should not affect write concern calculations

## Adding a Non-Voting Member

First, add the new node as a regular secondary and wait for initial sync to complete, then reconfigure:

```javascript
// Add the member first
rs.add("node8.example.com:27017")

// Wait for initial sync
// Check status
rs.status().members.find(m => m.host.includes("node8"))
// Look for stateStr: "SECONDARY" before proceeding
```

Now update the configuration to set `votes: 0` and `priority: 0`:

```javascript
var cfg = rs.conf()
var idx = cfg.members.findIndex(m => m.host === "node8.example.com:27017")
cfg.members[idx].votes = 0
cfg.members[idx].priority = 0
rs.reconfig(cfg)
```

A member with `votes: 0` must also have `priority: 0`. However, a member can have `priority: 0` while retaining `votes: 1` (e.g., hidden members). Arbiters are the exception: they always have `votes: 1` and `priority: 0`.

## Verify Non-Voting Configuration

```javascript
rs.conf().members.filter(m => m.votes === 0).map(m => ({
  host: m.host,
  votes: m.votes,
  priority: m.priority,
  hidden: m.hidden
}))
```

## Read from Non-Voting Members

Non-voting members serve reads normally when using `secondary` or `secondaryPreferred` read preference:

```javascript
const client = new MongoClient(uri, {
  readPreference: "secondaryPreferred"
});
```

To force reads specifically to a tagged non-voting node:

```javascript
var cfg = rs.conf()
cfg.members[idx].tags = { role: "analytics" }
rs.reconfig(cfg)

// Then in application:
const client = new MongoClient(uri, {
  readPreference: "secondary",
  readPreferenceTags: [{ role: "analytics" }]
});
```

## Non-Voting Members and Write Concern

Non-voting members still acknowledge writes for `w: N` write concerns since they replicate data:

```javascript
// This write waits for 5 members including non-voting ones
db.collection.insertOne(
  { data: "value" },
  { writeConcern: { w: 5 } }
)
```

However, `w: majority` only counts voting members:

```javascript
// With 7 voting members, majority = 4 (does not count non-voting members)
db.collection.insertOne(
  { data: "value" },
  { writeConcern: { w: "majority" } }
)
```

## Summary

Non-voting members (`votes: 0`, `priority: 0`) allow MongoDB replica sets to scale beyond the 7-vote limit while keeping election topology stable. Add the member normally, wait for initial sync, then reconfigure with `votes: 0` and `priority: 0`. Non-voting members replicate all data and serve reads but never participate in elections. They do not count toward `w: majority` write concern calculations but do count for numeric write concern levels.
