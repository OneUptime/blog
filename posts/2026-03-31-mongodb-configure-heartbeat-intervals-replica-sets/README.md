# How to Configure Heartbeat Intervals for Replica Sets in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Heartbeat, Failover, Configuration

Description: Learn how MongoDB replica set heartbeats work, how to configure heartbeat intervals, and how these settings affect failover detection speed and election timing.

---

## What Are Replica Set Heartbeats?

MongoDB replica set members send heartbeat messages to each other every 2 seconds by default. Heartbeats serve two purposes:

1. **Health detection** - each member learns whether others are reachable
2. **Election triggering** - when a member misses enough heartbeats, an election begins to choose a new primary

Understanding heartbeat configuration lets you tune the tradeoff between fast failover detection and reduced replication network overhead.

## Default Heartbeat Timing

```text
Setting                    | Default | Description
---------------------------|---------|--------------------------------------------
heartbeatIntervalMillis    | 2000ms  | How often each member sends heartbeats
heartbeatTimeoutSecs       | 10s     | How long to wait before declaring a member unreachable
electionTimeoutMillis      | 10000ms | How long before triggering an election
```

With defaults, a primary failure is detected within 10-12 seconds and a new election completes in a few more seconds - total downtime of roughly 15-20 seconds.

## Configuring Heartbeat Settings

Heartbeat settings are configured in the replica set configuration's `settings` subdocument:

```javascript
const cfg = rs.conf();

// Set heartbeat timeout and election timeout for faster failover
cfg.settings.heartbeatTimeoutSecs = 5;
cfg.settings.electionTimeoutMillis = 5000;

rs.reconfig(cfg);
```

## Adjusting Heartbeat Interval

The heartbeat send interval is configured via `setParameter`:

```javascript
// Reduce heartbeat interval for faster health detection
// Note: this is per-node, run on each member
db.adminCommand({
  setParameter: 1,
  heartbeatIntervalMillis: 1000
});
```

Lowering to 1000ms doubles the heartbeat frequency, detecting failures faster but generating more replication network traffic.

## Checking Current Heartbeat Settings

```javascript
// View current replica set configuration including settings
const cfg = rs.conf();
printjson(cfg.settings);

// View heartbeat parameter on this node
db.adminCommand({ getParameter: 1, heartbeatIntervalMillis: 1 });
```

## Monitoring Heartbeat Health

Use `rs.status()` to see the last heartbeat time and heartbeat message for each member:

```javascript
rs.status().members.forEach(m => {
  print(`${m.name}: state=${m.stateStr}, lastHeartbeat=${m.lastHeartbeat}, ` +
        `pingMs=${m.pingMs}, heartbeatMessage=${m.lastHeartbeatMessage || 'ok'}`);
});
```

Members with high `pingMs` or stale `lastHeartbeat` times may have network issues that affect election stability.

## Choosing Appropriate Heartbeat Settings

```text
Deployment Type          | Recommended heartbeatTimeoutSecs | Notes
-------------------------|----------------------------------|----------------------------------
WAN-connected members    | 20-30                            | Higher latency needs larger timeout
Same datacenter          | 5-10 (default)                   | Good balance
Same rack / local        | 2-5                              | Fast failover, low latency
High write workloads     | Keep default (10)                | Avoid spurious elections
```

Setting `heartbeatTimeoutSecs` too low in a high-latency or high-CPU environment causes spurious elections that disrupt primary availability.

## Using catchUpTimeoutMillis for Faster Failover

Reduce the time a new primary spends catching up to speed up write availability after election:

```javascript
cfg.settings.catchUpTimeoutMillis = 2000; // 2 seconds (default -1 = infinite)
rs.reconfig(cfg);
```

Setting a finite `catchUpTimeoutMillis` trades durability (some recently acknowledged writes may be rolled back) for speed.

## Summary

MongoDB replica set heartbeats run every 2 seconds by default, with a 10-second timeout and 10-second election timeout. Tune `heartbeatTimeoutSecs` and `electionTimeoutMillis` in `rs.conf().settings` for faster failover in low-latency environments, or increase them for WAN-connected replicas. Monitor `rs.status()` for heartbeat delays and use `setParameter` to adjust `heartbeatIntervalMillis` per node. Always test failover timing after changing heartbeat settings in a staging environment before applying to production.
