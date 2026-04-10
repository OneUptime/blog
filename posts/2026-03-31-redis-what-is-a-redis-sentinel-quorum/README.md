# What Is a Redis Sentinel Quorum

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, Quorum, High Availability, Failover, Configuration

Description: Learn what a Redis Sentinel quorum is, how it prevents split-brain failovers, and how to choose the right quorum size for your deployment.

---

## What Is Redis Sentinel?

Redis Sentinel is the high-availability solution for Redis primary-replica setups. A Sentinel deployment consists of:
- One Redis primary
- One or more Redis replicas
- Multiple Sentinel processes that monitor the Redis nodes

Sentinels continuously check the health of the Redis primary. When the primary fails, Sentinels coordinate to promote one replica as the new primary.

## What Is a Quorum?

A quorum is the minimum number of Sentinel processes that must agree that the Redis primary is down before a failover is initiated. It is configured per monitored master:

```bash
# sentinel.conf
sentinel monitor mymaster 127.0.0.1 6379 2
#                 name     host       port quorum
```

In this example, quorum is `2` - at least 2 Sentinels must agree the primary is unreachable before failover starts.

## Why Quorum Matters: Preventing Split-Brain

Without a quorum requirement, any single Sentinel could trigger a failover due to a local network issue (e.g., the Sentinel itself lost connectivity while the primary is fine). This could result in:

1. Sentinel A thinks primary is down (network issue on Sentinel A's side)
2. Sentinel A promotes replica to primary
3. Now two Redis primaries exist simultaneously - a split-brain scenario
4. Clients write to both, data diverges

A quorum of 2 (out of 3 Sentinels) prevents this: at least one other Sentinel must also see the primary as unreachable before failover proceeds. If only Sentinel A has a network issue, neither B nor C will confirm the failure, so the quorum is not met and no failover occurs.

## Quorum vs. Majority

Two different thresholds are involved in Sentinel failover:

| Threshold | Purpose |
|-----------|---------|
| Quorum (configurable) | Minimum sentinels to agree primary is down (ODOWN state) |
| Majority (floor(N/2)+1) | Minimum sentinels that must authorize the actual failover |

Even if quorum is met, the failover leader must get authorization from a majority of all Sentinel processes. This is a separate, automatic check.

```text
Example with 3 Sentinels, quorum=2:
- Majority = floor(3/2)+1 = 2
- Quorum=2 means 2 must detect failure
- 2 must authorize failover
- With 3 Sentinels, losing 1 Sentinel still allows failover (2 remain)
```

## Choosing the Right Quorum Size

The recommended setup is **an odd number of Sentinels** with **quorum = majority**:

| Sentinels | Quorum | Sentinels that can fail | Notes |
|-----------|--------|------------------------|-------|
| 1 | 1 | 0 | Avoid - single point of failure |
| 2 | 2 | 0 | Avoid - any Sentinel failure blocks failover |
| 3 | 2 | 1 | Recommended minimum |
| 5 | 3 | 2 | Better fault tolerance |
| 7 | 4 | 3 | Large, highly available setup |

With 3 Sentinels and quorum=2, you can lose 1 Sentinel and still failover successfully.

## Configuring Sentinels

```bash
# /etc/redis/sentinel.conf

# Monitor primary named 'mymaster' at given IP:port, quorum=2
sentinel monitor mymaster 192.168.1.10 6379 2

# Mark primary as SDOWN after this many ms of unresponsiveness
sentinel down-after-milliseconds mymaster 10000

# Allow 60 seconds for the failover to complete
sentinel failover-timeout mymaster 60000

# How many replicas can resync in parallel after failover
sentinel parallel-syncs mymaster 1

# Optional: password
sentinel auth-pass mymaster yourStrongPassword
```

## Checking Sentinel Quorum Status

```bash
# Check if quorum is met from this Sentinel's perspective
redis-cli -p 26379 SENTINEL CKQUORUM mymaster

# Output when healthy:
# OK 3 usable Sentinels. Quorum and failover authorization can be reached

# Output when quorum not reachable:
# NOQUORUM 1 usable Sentinels. Not enough available Sentinels to reach majority

# List all Sentinels known to this Sentinel
redis-cli -p 26379 SENTINEL SENTINELS mymaster

# Check primary info
redis-cli -p 26379 SENTINEL MASTER mymaster

# Check replicas
redis-cli -p 26379 SENTINEL SLAVES mymaster
```

## Testing Failover

```bash
# Trigger a manual failover (useful for testing)
redis-cli -p 26379 SENTINEL FAILOVER mymaster

# Watch Sentinel logs during failover
tail -f /var/log/redis/sentinel.log

# Verify new primary after failover
redis-cli -p 26379 SENTINEL GET-MASTER-ADDR-BY-NAME mymaster
```

## Connecting Applications via Sentinel

```python
from redis.sentinel import Sentinel

sentinel = Sentinel([
    ('sentinel-1.example.com', 26379),
    ('sentinel-2.example.com', 26379),
    ('sentinel-3.example.com', 26379),
], socket_timeout=0.5, decode_responses=True)

# Always connects to current primary
primary = sentinel.master_for('mymaster', socket_timeout=0.5)

# Reads can go to any replica
replica = sentinel.slave_for('mymaster', socket_timeout=0.5)

primary.set('key', 'value')
value = replica.get('key')
```

## Summary

A Redis Sentinel quorum is the minimum number of Sentinels that must agree a primary is unreachable before failover begins. It prevents false failovers caused by isolated network issues. The recommended setup is 3 Sentinels with quorum=2, tolerating 1 Sentinel failure while still enabling automatic failover. Always verify quorum health with `SENTINEL CKQUORUM` and test failover procedures regularly in a staging environment.
