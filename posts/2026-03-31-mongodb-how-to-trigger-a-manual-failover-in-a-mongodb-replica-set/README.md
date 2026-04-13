# How to Trigger a Manual Failover in a MongoDB Replica Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Failover, Operation, High Availability

Description: Trigger a controlled MongoDB replica set primary stepdown to perform maintenance or test failover behavior without data loss.

---

## When to Trigger a Manual Failover

Manual failover (stepping down the primary) is necessary before maintenance such as OS patching, MongoDB version upgrades, or hardware replacement on the primary node. It allows you to choose which node becomes primary rather than waiting for an unplanned election.

## Trigger a Stepdown Using rs.stepDown()

Connect to the current primary and call `rs.stepDown()`:

```javascript
mongosh --host primary-host:27017
```

```javascript
// Step down for 60 seconds, wait up to 10 seconds for a secondary to catch up
rs.stepDown(60, 10);
```

The arguments are:
- `stepDownSecs` (60): How many seconds the node refuses to be primary after stepping down
- `secondaryCatchUpPeriodSecs` (10): How long to wait for a secondary to catch up before stepping down; if no secondary catches up in time, the command errors and the primary does not step down

After the command, the shell connection will be dropped (you connected to the primary, which is now a secondary). MongoDB automatically holds an election and a secondary becomes the new primary.

## Verify the New Primary

After the stepdown, check which node is the new primary:

```javascript
// Connect to any replica set member
rs.status().members.filter(m => m.stateStr === "PRIMARY")
```

Or use the replica set URI and the `db.hello()` command:

```javascript
db.hello().primary
```

## Stepdown with Specific Secondary Target

If you want a specific secondary to become primary, increase its priority temporarily before the stepdown:

```javascript
// Boost secondary priority
const cfg = rs.conf();
const targetIdx = cfg.members.findIndex(m => m.host === "192.168.1.11:27018");
cfg.members[targetIdx].priority = 10;
rs.reconfig(cfg);

// Now step down the primary - the high-priority secondary will win the election
rs.stepDown(60);
```

After the failover completes, connect to the **new primary** and restore the original priority:

```javascript
// Connect to the new primary, then restore original priority
const cfg2 = rs.conf();
const targetIdx2 = cfg2.members.findIndex(m => m.host === "192.168.1.11:27018");
cfg2.members[targetIdx2].priority = 1;
rs.reconfig(cfg2);
```

## Freeze a Secondary from Becoming Primary

If you want to prevent a specific secondary from winning the election during stepdown:

```javascript
// On the secondary you want to freeze
rs.freeze(120); // Will not participate in elections for 120 seconds
```

## Checking Replication Lag Before Stepdown

Before stepping down, ensure secondaries are caught up to minimize election time:

```javascript
rs.printSecondaryReplicationInfo()
```

If lag is high, increase the `secondaryCatchUpPeriodSecs` argument to `rs.stepDown()`.

## Summary

Use `rs.stepDown()` on the primary to trigger a controlled failover before maintenance. MongoDB will elect a new primary automatically. Pre-adjust member priorities if you want a specific secondary to win, and verify replication lag is low before stepping down to ensure a smooth, fast election.
