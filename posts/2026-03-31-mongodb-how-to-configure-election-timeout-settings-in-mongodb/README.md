# How to Configure Election Timeout Settings in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Election, Timeout, High Availability

Description: Learn how to configure election timeout settings in MongoDB replica sets to control failover speed and balance between availability and stability.

---

## How Elections Work in MongoDB

When a primary becomes unavailable, the replica set members elect a new primary. The speed of this process is controlled by election timeout settings. Faster timeouts improve availability but can cause unnecessary elections on transient network blips.

## Key Election Parameters

The main parameter is `electionTimeoutMillis`, set in the replica set configuration:

```javascript
rs.conf()
// Look for settings.electionTimeoutMillis
```

## Viewing Current Settings

```javascript
cfg = rs.conf()
printjson(cfg.settings)
```

## Changing electionTimeoutMillis

```javascript
cfg = rs.conf()
cfg.settings.electionTimeoutMillis = 10000  // 10 seconds (default is 10000ms)
rs.reconfig(cfg)
```

For faster failover in latency-sensitive environments:

```javascript
cfg.settings.electionTimeoutMillis = 5000  // 5 seconds
rs.reconfig(cfg)
```

## heartbeatTimeoutSecs

Heartbeat timeout controls how long to wait before declaring a member unreachable:

```javascript
cfg = rs.conf()
cfg.settings.heartbeatTimeoutSecs = 10  // default is 10 seconds
rs.reconfig(cfg)
```

## Catchup Period

After election, the new primary enters a catchup phase to apply any missing operations:

```javascript
cfg = rs.conf()
cfg.settings.catchUpTimeoutMillis = 60000   // 60 seconds (default: -1 = indefinite)
cfg.settings.catchUpTakeoverDelayMillis = 30000  // time before catchup takeover
rs.reconfig(cfg)
```

## Recommended Settings by Environment

For high-availability production environments:

```javascript
cfg = rs.conf()
cfg.settings.electionTimeoutMillis = 10000
cfg.settings.heartbeatTimeoutSecs = 10
cfg.settings.catchUpTimeoutMillis = 60000
rs.reconfig(cfg)
```

For low-latency trading or SLA-sensitive workloads:

```javascript
cfg = rs.conf()
cfg.settings.electionTimeoutMillis = 5000
cfg.settings.heartbeatTimeoutSecs = 5
cfg.settings.catchUpTimeoutMillis = 30000
rs.reconfig(cfg)
```

## Monitoring Election Events

Check replica set status after reconfiguration:

```javascript
rs.status()
```

Look for `electionDate` and `lastHeartbeatMessage` fields to confirm members are healthy.

## Summary

MongoDB election timeouts are configured via `rs.reconfig()` on the `settings` object. The key parameters are `electionTimeoutMillis`, `heartbeatTimeoutSecs`, `catchUpTimeoutMillis`, and `catchUpTakeoverDelayMillis`. Reducing these values speeds up failover but increases sensitivity to transient network issues, so tuning should be based on your infrastructure's actual reliability characteristics.
