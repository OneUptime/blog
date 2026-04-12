# How to Reconfigure a Replica Set Without Downtime in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Administration, High Availability, Database

Description: Learn how to safely reconfigure a MongoDB replica set without downtime, including adding members, changing priorities, and updating settings using rs.reconfig().

---

MongoDB's `rs.reconfig()` command applies configuration changes to a running replica set without requiring downtime. However, some changes cause brief elections while others are applied instantly. Understanding the difference is key to safe reconfiguration.

## The Safe Reconfigure Pattern

Always read, modify, then write:

```javascript
var cfg = rs.conf();
// Make changes to cfg
rs.reconfig(cfg);
```

Never construct a config from scratch - you might accidentally omit existing members or settings.

## Changes That Do NOT Cause an Election

- Updating `priority` of a non-primary member (if the new value does not exceed the current primary's priority)
- Changing `hidden`, `tags`, or `secondaryDelaySecs`
- Modifying `settings` values like `heartbeatIntervalMillis` or `chainingAllowed`

## Changes That May Cause an Election

- Changing the priority of the current primary to a lower value than another member
- Changing a secondary member's priority to a value higher than the current primary's
- Adding a member with higher priority than the current primary
- Adding or removing voting members (alters the quorum calculation)
- Changing `votes` on a member (alters the voting topology)

## Adding a New Member

```javascript
var cfg = rs.conf();
cfg.members.push({
  _id: 3,
  host: "mongo4:27017",
  priority: 1,
  votes: 1
});
rs.reconfig(cfg);
```

The new member starts as `STARTUP2` and performs an initial sync before becoming `SECONDARY`.

## Removing a Member

```javascript
var cfg = rs.conf();
cfg.members = cfg.members.filter(m => m.host !== "mongo3:27017");
rs.reconfig(cfg);
```

Always ensure enough voting members remain to maintain quorum.

## Changing a Member to Hidden

```javascript
var cfg = rs.conf();
var idx = cfg.members.findIndex(m => m.host === "mongo3:27017");
cfg.members[idx].hidden = true;
cfg.members[idx].priority = 0;  // hidden members must have priority 0
rs.reconfig(cfg);
```

## Force Reconfigure (Use with Caution)

If a majority of members are unavailable (e.g., during disaster recovery), use `force: true`:

```javascript
rs.reconfig(cfg, { force: true })
```

This bypasses the majority requirement and increments the config version by a large jump. Use only when the set cannot reach quorum and you understand the risks of split-brain.

## Verifying the Change

```javascript
rs.conf().version  // should be incremented
rs.conf().members  // inspect member list
```

Also check status to ensure no unexpected elections occurred:

```javascript
rs.status().members.map(m => ({ host: m.name, state: m.stateStr }))
```

## Reconfiguring Settings

Update global settings in the same pattern:

```javascript
var cfg = rs.conf();
cfg.settings.electionTimeoutMillis = 5000;  // faster elections
cfg.settings.heartbeatIntervalMillis = 1000;
rs.reconfig(cfg);
```

## Common Errors

```text
MongoServerError: replSetReconfig should only be run on PRIMARY
```

Connect to the primary before running `rs.reconfig()`.

```text
MongoServerError: Quorum check failed because not enough voting nodes responded
```

A voting member is unreachable. Resolve the connectivity issue or use `force: true` if you are in a recovery scenario.

## Summary

`rs.reconfig()` is the safe, live mechanism for updating a MongoDB replica set configuration. Always read the current config first, modify only the fields you intend to change, and write back. Monitor `rs.status()` after changes to confirm all members are healthy and no unintended elections occurred. Reserve `force: true` for disaster recovery scenarios only.

