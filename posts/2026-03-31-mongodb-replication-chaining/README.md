# How to Configure Replication Chaining in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Replication, Configuration, Database

Description: Learn how to enable, disable, and configure replication chaining in MongoDB, where secondaries sync from other secondaries instead of the primary.

---

By default, MongoDB allows **replication chaining** - a secondary can replicate from another secondary rather than directly from the primary. This reduces load on the primary but can increase replication lag and complicate troubleshooting. This guide explains how to control chaining behavior.

## What Is Replication Chaining?

In a standard replica set, all secondaries pull the oplog from the primary. With chaining enabled, a secondary (S2) may choose to replicate from another secondary (S1) if S1 has a better network path:

```text
Primary -> S1 -> S2 (chained)
```

MongoDB determines the sync source automatically using ping times unless you configure it explicitly.

## Check Current Chaining Configuration

```javascript
rs.conf().settings
```

If `chainingAllowed` is `true` (the default), chaining is permitted.

## Disable Replication Chaining

To force all secondaries to replicate directly from the primary:

```javascript
var cfg = rs.conf();
cfg.settings = cfg.settings || {};
cfg.settings.chainingAllowed = false;
rs.reconfig(cfg);
```

**Note:** Starting in MongoDB 5.0.2, setting `chainingAllowed` to `false` alone does not prevent chaining. You must also set the `enableOverrideClusterChainingSetting` server parameter to `true` for the setting to take effect:

```javascript
db.adminCommand({ setParameter: 1, enableOverrideClusterChainingSetting: true });
```

This is useful in latency-sensitive setups or when you want predictable replication topology.

## Re-enable Chaining

```javascript
var cfg = rs.conf();
cfg.settings.chainingAllowed = true;
rs.reconfig(cfg);
```

## Force a Specific Sync Source

Even with chaining disabled globally, you can manually set the sync source for a member using `replSetSyncFrom` on the secondary itself:

```javascript
// Connect to the secondary and run:
rs.syncFrom("mongo1:27017");
```

This is temporary and resets after a restart or re-election. To make it permanent, keep chaining disabled and rely on the auto-selection logic, which always picks the primary when chaining is off.

## Monitor Sync Sources

Check where each secondary is currently syncing from:

```javascript
rs.status().members.map(m => ({ host: m.name, syncSourceHost: m.syncSourceHost }))
```

Example output:

```text
[
  { host: 'mongo1:27017', syncSourceHost: '' },        // primary
  { host: 'mongo2:27017', syncSourceHost: 'mongo1:27017' },
  { host: 'mongo3:27017', syncSourceHost: 'mongo2:27017' } // chained
]
```

## When to Use Chaining

**Enable chaining when:**
- You have cross-datacenter members and want to reduce WAN traffic to the primary
- A secondary in a remote region can get faster syncs from a nearby secondary

**Disable chaining when:**
- You need the lowest possible replication lag
- Debugging replication issues and want a simple, predictable topology
- Secondary S1 falls behind - chaining would cause S2 to lag even more

## Heartbeat Timeout

Replication sync source selection is influenced by heartbeat timing. The default heartbeat interval is 2 seconds, and the default heartbeat timeout is 10 seconds. You can configure the timeout:

```javascript
var cfg = rs.conf();
cfg.settings.heartbeatTimeoutSecs = 10;
rs.reconfig(cfg);
```

Lowering the heartbeat timeout causes members to be marked as unreachable sooner, which can speed up failover but may cause false positives on slow networks.

**Note:** The `heartbeatIntervalMillis` setting is marked as internal use only in the MongoDB documentation and should not be modified.

## Summary

Replication chaining is enabled by default in MongoDB and allows secondaries to replicate from other secondaries when network topology favors it. Disable it via `chainingAllowed: false` in the replica set settings when you need predictable, direct replication from the primary. Use `rs.status()` to monitor sync sources and `rs.syncFrom()` for temporary manual overrides.

