# How to Handle Failover Events in Redis Sentinel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, Failover, Event, High Availability

Description: Learn how to detect, respond to, and recover from Redis Sentinel failover events in your applications and infrastructure.

---

Redis Sentinel failover is automatic, but your applications and infrastructure still need to respond correctly. This guide covers how Sentinel notifies you of failovers, how to handle them in code, and how to verify a clean failover occurred.

## Failover Event Flow

```text
1. Primary becomes unreachable
2. Sentinels mark it S-DOWN (subjectively down)
3. Quorum reached -> O-DOWN declared
4. Sentinels elect a failover leader
5. Leader promotes a replica to primary
6. Other replicas are reconfigured
7. Sentinel updates its state
8. Clients must redirect to the new primary
```

## Detecting Failover via Pub/Sub

Sentinel publishes events to a Pub/Sub channel. Subscribe to monitor:

```bash
redis-cli -p 26379 PSUBSCRIBE '*'
```

Key events you will see:

```text
+sdown        master mymaster 192.168.1.10 6379
+odown        master mymaster 192.168.1.10 6379 #quorum 2/2
+try-failover master mymaster 192.168.1.10 6379
+elected-leader master mymaster 192.168.1.10 6379
+failover-state-select-slave ...
+selected-slave slave 192.168.1.11:6380 ...
+promoted-slave ...
+failover-state-reconf-slaves ...
+slave-reconf-sent ...
+slave-reconf-inprog ...
+slave-reconf-done ...
+failover-end   master mymaster 192.168.1.10 6379
+switch-master  mymaster 192.168.1.10 6379 192.168.1.11 6380
```

The `+switch-master` event is what clients and automation scripts should act on.

## Handling Failover in Application Code

Use a Sentinel-aware client that automatically reconnects. Example with Python redis-py:

```python
from redis.sentinel import Sentinel

sentinel = Sentinel(
    [('sentinel-1', 26379), ('sentinel-2', 26379), ('sentinel-3', 26379)],
    socket_timeout=0.1
)

# Always get a fresh master reference
master = sentinel.master_for('mymaster', socket_timeout=0.1)
replica = sentinel.slave_for('mymaster', socket_timeout=0.1)

def safe_write(key, value):
    for attempt in range(3):
        try:
            conn = sentinel.master_for('mymaster', socket_timeout=0.1)
            conn.set(key, value)
            return
        except Exception as e:
            print(f"Write failed (attempt {attempt+1}): {e}")
    raise Exception("Failed after 3 attempts")
```

## Subscribing to Failover Notifications

```python
import redis

sentinel_conn = redis.Redis(host='sentinel-1', port=26379)
pubsub = sentinel_conn.pubsub()
pubsub.psubscribe('*')

for message in pubsub.listen():
    if message['type'] == 'pmessage':
        if message['channel'] == b'+switch-master':
            print(f"Failover occurred: {message['data']}")
            # Trigger your alerting/automation here
```

## Verifying a Clean Failover

After failover, verify the topology is healthy:

```bash
# Check new primary
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster

# Verify all replicas followed the new primary
redis-cli -p 26379 SENTINEL replicas mymaster

# Check new primary replication state
NEW_PRIMARY_HOST=$(redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster | head -1)
NEW_PRIMARY_PORT=$(redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster | tail -1)
redis-cli -h $NEW_PRIMARY_HOST -p $NEW_PRIMARY_PORT INFO replication
```

## Post-Failover Checklist

```text
1. New primary accepts writes
2. All replicas show master_link_status:up
3. Application clients are using the new primary
4. No stale connections to the old primary
5. Sentinel state is consistent across all 3 Sentinels
6. Incident documented with timeline
```

## Summary

Redis Sentinel failover events are communicated via Pub/Sub channels, with `+switch-master` being the key event to act on. Use Sentinel-aware client libraries to handle automatic reconnection, subscribe to Sentinel channels for alerting, and verify the post-failover topology with `SENTINEL replicas` to confirm a clean recovery.
