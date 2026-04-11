# How to Implement Game World State Synchronization with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Gaming, Synchronization, Pub/Sub, Hash

Description: Synchronize game world state across multiple servers using Redis hashes for entity positions and Pub/Sub for real-time change broadcasting to all connected game nodes.

---

In multiplayer games, multiple server nodes must share a consistent view of the world - player positions, object states, zone conditions. Redis acts as the authoritative world state store that all nodes read from and write to, with Pub/Sub to push deltas in real time.

## Storing Entity State

Each entity (player, NPC, object) gets a hash:

```bash
HSET entity:player:1001 x 145.3 y 89.2 z 0.0 zone forest_01 hp 100 state idle
HSET entity:npc:5001 x 200.0 y 150.0 z 0.0 zone forest_01 hp 50 state patrol
```

## Batch Position Updates

Game servers send position updates in bulk. Use pipelines:

```python
import redis
r = redis.Redis()

def batch_update_positions(updates):
    pipe = r.pipeline()
    for entity_id, x, y, zone in updates:
        pipe.hset(f"entity:player:{entity_id}", mapping={"x": x, "y": y, "zone": zone})
    pipe.execute()
```

## Zone-Based Player Index

Track which players are in each zone with a set:

```bash
SADD zone:forest_01:players 1001 1002 1003
SREM zone:forest_01:players 1001
SADD zone:desert_02:players 1001
```

This allows zone servers to quickly find neighbors without scanning all entities.

## Broadcasting State Changes

When an entity moves or changes state, publish to a channel:

```python
import json

def update_and_broadcast(entity_type, entity_id, changes):
    key = f"entity:{entity_type}:{entity_id}"
    r.hset(key, mapping=changes)
    event = json.dumps({"entity_type": entity_type, "entity_id": entity_id, "changes": changes})
    r.publish(f"world:zone:{changes.get('zone', 'global')}", event)
```

## Subscribing to Zone Events

Each game node subscribes to the zones it manages:

```python
def listen_for_zone_updates(zone_id):
    pubsub = r.pubsub()
    pubsub.subscribe(f"world:zone:{zone_id}")
    for message in pubsub.listen():
        if message["type"] == "message":
            event = json.loads(message["data"])
            apply_state_change(event)
```

## State Snapshots for Reconnecting Clients

When a player reconnects, fetch a full zone snapshot:

```python
def get_zone_snapshot(zone_id):
    player_ids = r.smembers(f"zone:{zone_id}:players")
    snapshot = {}
    pipe = r.pipeline()
    for pid in player_ids:
        pipe.hgetall(f"entity:player:{pid.decode()}")
    results = pipe.execute()
    for pid, state in zip(player_ids, results):
        snapshot[pid.decode()] = state
    return snapshot
```

## Conflict Resolution

Use version counters to detect stale writes:

```lua
local key = KEYS[1]
local new_version = tonumber(ARGV[1])
local current_version = tonumber(redis.call("HGET", key, "version") or "0")
if new_version <= current_version then
  return redis.error_reply("STALE_UPDATE")
end
redis.call("HSET", key, "version", new_version, "x", ARGV[2], "y", ARGV[3])
return 1
```

## Summary

Redis provides a fast, shared world state store that game server nodes can read and write with sub-millisecond latency. Zone-based indexing with sets, real-time Pub/Sub broadcasting, and versioned writes keep all nodes synchronized without complex consensus protocols or database bottlenecks.
