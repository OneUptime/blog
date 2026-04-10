# How to Add and Remove Sentinels in a Running Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, Operation, Configuration, High Availability

Description: Learn how to add new Sentinel processes and safely remove existing ones from a running Redis Sentinel setup without disrupting monitoring.

---

Redis Sentinel setups occasionally need Sentinels added (scaling out, replacing failed nodes) or removed (decommissioning servers). These operations can be done without downtime if done carefully.

## Adding a New Sentinel

Adding a Sentinel is straightforward - new Sentinels auto-discover the cluster topology.

### Step 1 - Create the Sentinel Configuration

```bash
# /etc/redis/sentinel-4.conf
port 26379
daemonize yes
logfile /var/log/redis/sentinel-4.log
dir /tmp

sentinel monitor mymaster 192.168.1.10 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

Point to the current primary. Sentinel will discover other Sentinels and replicas automatically via the primary's Pub/Sub channel.

### Step 2 - Start the New Sentinel

```bash
redis-sentinel /etc/redis/sentinel-4.conf
```

### Step 3 - Verify Discovery

```bash
redis-cli -p 26379 SENTINEL sentinels mymaster
```

Within a few seconds, the new Sentinel should appear in the list on existing Sentinels. Also verify from the new Sentinel:

```bash
redis-cli -p 26379 -h sentinel-4 SENTINEL sentinels mymaster
# Should list existing Sentinels
```

### Step 4 - Consider Updating Quorum

If you're scaling from 3 to 5 Sentinels, consider updating quorum:

```bash
redis-cli -p 26379 SENTINEL SET mymaster quorum 3
# Update on all Sentinels
redis-cli -p 26380 SENTINEL SET mymaster quorum 3
redis-cli -p 26381 SENTINEL SET mymaster quorum 3
```

## Removing a Sentinel

Removing a Sentinel requires telling other Sentinels to forget about it.

### Step 1 - Stop the Sentinel Process

```bash
redis-cli -h sentinel-to-remove -p 26379 SHUTDOWN
```

### Step 2 - Remove from Other Sentinels' State

Other Sentinels never automatically forget a Sentinel they have seen, even if it becomes unreachable. Force them to forget it:

```bash
# Get the removed Sentinel's runid
redis-cli -p 26379 SENTINEL sentinels mymaster
# Note the "runid" field of the Sentinel to remove

# Reset each monitored master to clear stale Sentinel info
redis-cli -p 26379 SENTINEL RESET mymaster
redis-cli -p 26380 SENTINEL RESET mymaster
redis-cli -p 26381 SENTINEL RESET mymaster
```

`SENTINEL RESET` causes each Sentinel to re-discover the topology, dropping stale entries.

### Step 3 - Verify Removal

```bash
redis-cli -p 26379 SENTINEL sentinels mymaster
# Removed Sentinel should no longer appear
```

Check `num-other-sentinels` in the master info:

```bash
redis-cli -p 26379 SENTINEL masters | grep -A1 num-other-sentinels
```

## Replacing a Failed Sentinel

If a Sentinel host has permanently failed:

```bash
# 1. Stop anything running on the old Sentinel host (if possible)

# 2. Reset all remaining Sentinels
redis-cli -p 26379 SENTINEL RESET mymaster
redis-cli -p 26380 SENTINEL RESET mymaster

# 3. Start a new Sentinel on a new host
# (configure it to monitor the current primary)

# 4. Verify quorum is maintained
redis-cli -p 26379 SENTINEL masters | grep -A1 quorum
```

## Summary

Adding Sentinels is as simple as starting a new Sentinel process pointing at the current primary - it auto-discovers everything. Removing Sentinels requires stopping the process and running `SENTINEL RESET` on remaining Sentinels to clear stale state. Always verify quorum remains at a majority after any Sentinel count change.
