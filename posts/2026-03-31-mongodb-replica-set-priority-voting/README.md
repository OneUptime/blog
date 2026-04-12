# How to Configure Replica Set Priority and Voting in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, High Availability, Configuration, Database

Description: Learn how to configure replica set member priority and voting rights in MongoDB to control which members become primary and participate in elections.

---

In a MongoDB replica set, each member has two key properties that govern elections: **priority** and **votes**. Priority controls which member is preferred as primary; votes determines whether a member participates in elections at all.

## Understanding Priority

- Priority range: `0` to `1000` (default `1`)
- The member with the highest priority becomes primary when an election occurs
- Priority `0` means the member can never become primary (useful for dedicated secondaries)
- Two members can have the same priority; the first eligible member to secure a majority vote wins the election (a member must be sufficiently caught up with the primary's oplog to be eligible)

## Understanding Votes

- Each voting member has `1` vote; non-voting members have `0`
- Replica sets can have up to `7` voting members
- A majority of votes is required to elect a primary
- Non-voting members still replicate data but do not influence elections

## Viewing the Current Configuration

```javascript
rs.conf()
```

Sample output for a 3-member set:

```text
{
  members: [
    { _id: 0, host: "mongo1:27017", priority: 1, votes: 1 },
    { _id: 1, host: "mongo2:27017", priority: 1, votes: 1 },
    { _id: 2, host: "mongo3:27017", priority: 1, votes: 1 }
  ]
}
```

## Setting Priority

Connect to the primary and reconfigure:

```javascript
var cfg = rs.conf();

// Prefer mongo1 as primary
cfg.members[0].priority = 10;

// mongo2 as secondary fallback
cfg.members[1].priority = 5;

// mongo3 as a read-only replica, never primary
cfg.members[2].priority = 0;

rs.reconfig(cfg);
```

The member with priority `0` still replicates and can serve reads depending on your read preference, but it will never be elected primary.

## Configuring Non-Voting Members

Non-voting members are useful when you need more than 7 members for data redundancy but want to stay within the 7-vote limit:

```javascript
var cfg = rs.conf();

// Add 8th member as non-voting data bearing secondary
cfg.members[7].priority = 0;
cfg.members[7].votes = 0;

rs.reconfig(cfg);
```

A member with `votes: 0` must also have `priority: 0`. Setting priority > 0 on a non-voting member is an error.

## Priority and Votes in Initial Config

You can set these when initializing the replica set:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017", priority: 10, votes: 1 },
    { _id: 1, host: "mongo2:27017", priority: 5,  votes: 1 },
    { _id: 2, host: "mongo3:27017", priority: 0,  votes: 1 }
  ]
});
```

## Forcing an Election to Test Priority

After reconfiguring, trigger a stepdown on the current primary to verify the priority takes effect:

```javascript
rs.stepDown();
```

Wait a few seconds, then check which member became primary:

```javascript
db.hello().primary
```

## Caution with Single-Vote Sets

If you set all non-primary members to `votes: 0`, a single node failure loses quorum and the replica set goes read-only. Always maintain an odd number of voting members (3, 5, or 7) to tolerate failures.

## Summary

MongoDB replica set priority and voting are independent controls: priority determines election preference while votes determines election participation. Set priority to `0` for dedicated analytics replicas or cross-region standbys. Use non-voting members (`votes: 0`, `priority: 0`) when you need more than 7 data-bearing members. Always test priority changes by triggering a stepdown to confirm the intended member is elected.

