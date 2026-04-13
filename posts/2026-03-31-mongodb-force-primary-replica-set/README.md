# How to Force a Replica Set Member to Become Primary in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Administration, Failover, Database

Description: Learn how to force a specific MongoDB replica set member to become primary using priority changes and stepdown, including safe procedures and recovery steps.

---

There are situations where you need a specific MongoDB replica set member to become primary: planned maintenance, data center failover drills, or post-incident recovery. MongoDB does not provide a direct "make this member primary" command, but you can achieve it by combining priority changes with `rs.stepDown()`.

## Method 1 - Raise Priority of Target Member

The cleanest approach is to temporarily raise the target member's priority above all others and then step down the current primary.

### Step 1 - Identify the Current Primary and Target

```javascript
rs.status().members.map(m => ({ host: m.name, state: m.stateStr }))
rs.conf().members.map(m => ({ host: m.host, priority: m.priority }))
```

### Step 2 - Raise Priority of the Target Member

Connect to the current primary:

```javascript
var cfg = rs.conf();
// Set mongo2 as the preferred primary
cfg.members.forEach(m => m.priority = 1);          // reset all to 1
cfg.members.find(m => m.host === "mongo2:27017").priority = 100;
rs.reconfig(cfg);
```

### Step 3 - Step Down the Current Primary

```javascript
rs.stepDown(30)  // current primary steps down for 30 seconds
```

MongoDB holds an election. Because mongo2 has the highest priority and is caught up, it should win.

### Step 4 - Verify

```javascript
db.hello().primary  // should show mongo2:27017
```

### Step 5 - Restore Original Priorities

```javascript
var cfg = rs.conf();
cfg.members.forEach(m => m.priority = 1);  // restore equal priorities
rs.reconfig(cfg);
```

## Method 2 - Freeze All Other Members

An alternative is to freeze (temporarily prevent from being elected) all members except the target:

```javascript
// Connect to each non-target secondary and run:
rs.freeze(120)  // prevent this member from seeking election for 120 seconds
```

Then step down the primary from the primary node:

```javascript
rs.stepDown(30)
```

The target member (the only non-frozen secondary) wins the election. Frozen members automatically unfreeze after the timeout.

## Handling Replication Lag

A member with significant replication lag cannot immediately become primary even with high priority. MongoDB's `catchUpTimeoutMillis` setting controls how long a newly elected primary waits to catch up before accepting writes:

```javascript
var cfg = rs.conf();
cfg.settings.catchUpTimeoutMillis = 10000;  // wait up to 10s to catch up
rs.reconfig(cfg);
```

Check replication lag before forcing a failover:

```javascript
rs.printSecondaryReplicationInfo()
```

## Force Election in an Emergency

If the primary is completely unreachable and you have a majority of members available, MongoDB will elect a new primary automatically. If not enough members are available for quorum:

```javascript
// Last resort - only on an isolated secondary you trust
rs.reconfig(cfg, { force: true })
```

This forces the member to reconfigure as if it has quorum. Use only when you are certain the current primary will not reconnect.

## Summary

To force a specific member to become primary, raise its priority to the highest value, then step down the current primary using `rs.stepDown()`. After the desired member is elected, restore the original priorities. Use `rs.freeze()` as an alternative when you want to ensure a specific secondary wins without permanently altering priorities. Always check replication lag before forcing a failover to avoid data loss.

