# How to Build a Real-Time Multiplayer Game Lobby with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Multiplayer, Game, Lobby, Backend

Description: Build a real-time multiplayer game lobby with Redis hashes, sets, and Pub/Sub to match players, track lobby state, and broadcast readiness updates with low latency.

---

A game lobby must match players quickly, track who is ready, and start the game when all players are set. Redis provides the fast, shared state needed for real-time coordination between game servers and players.

## Creating a Lobby

Each lobby is a Redis hash with metadata and a set of members:

```python
import redis
import uuid
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
LOBBY_TTL = 600  # 10 minutes

def create_lobby(game_mode: str, max_players: int, created_by: str) -> str:
    lobby_id = str(uuid.uuid4())[:8].upper()
    pipe = r.pipeline()
    pipe.hset(f"lobby:{lobby_id}", mapping={
        "game_mode": game_mode,
        "max_players": str(max_players),
        "status": "waiting",
        "created_by": created_by,
        "created_at": str(time.time()),
    })
    pipe.expire(f"lobby:{lobby_id}", LOBBY_TTL)
    pipe.zadd("lobbies:open", {lobby_id: time.time()})
    pipe.execute()
    return lobby_id
```

## Joining and Leaving

```python
def join_lobby(lobby_id: str, player_id: str, player_name: str) -> bool:
    lobby = r.hgetall(f"lobby:{lobby_id}")
    if not lobby or lobby.get("status") != "waiting":
        return False
    current_count = r.scard(f"lobby:{lobby_id}:players")
    if current_count >= int(lobby.get("max_players", 4)):
        return False
    pipe = r.pipeline()
    pipe.sadd(f"lobby:{lobby_id}:players", player_id)
    pipe.expire(f"lobby:{lobby_id}:players", LOBBY_TTL)
    pipe.hset(f"lobby:{lobby_id}:player:{player_id}", mapping={
        "name": player_name,
        "ready": "0",
        "joined_at": str(time.time()),
    })
    pipe.expire(f"lobby:{lobby_id}:player:{player_id}", LOBBY_TTL)
    pipe.execute()
    r.publish(f"lobby:{lobby_id}:events", f"join:{player_id}:{player_name}")
    return True

def leave_lobby(lobby_id: str, player_id: str):
    pipe = r.pipeline()
    pipe.srem(f"lobby:{lobby_id}:players", player_id)
    pipe.delete(f"lobby:{lobby_id}:player:{player_id}")
    pipe.execute()
    r.publish(f"lobby:{lobby_id}:events", f"leave:{player_id}")
```

## Ready State Management

```python
def set_ready(lobby_id: str, player_id: str, is_ready: bool):
    r.hset(f"lobby:{lobby_id}:player:{player_id}", "ready", "1" if is_ready else "0")
    r.publish(f"lobby:{lobby_id}:events", f"ready:{player_id}:{is_ready}")
    check_all_ready(lobby_id)

def check_all_ready(lobby_id: str):
    players = r.smembers(f"lobby:{lobby_id}:players")
    if not players:
        return
    all_ready = all(
        r.hget(f"lobby:{lobby_id}:player:{p}", "ready") == "1"
        for p in players
    )
    if all_ready and len(players) >= 2:
        r.hset(f"lobby:{lobby_id}", "status", "starting")
        r.zrem("lobbies:open", lobby_id)
        r.publish(f"lobby:{lobby_id}:events", "game_start")
```

## Subscribing to Lobby Events

```python
def subscribe_to_lobby(lobby_id: str, callback):
    sub = r.pubsub()
    sub.subscribe(f"lobby:{lobby_id}:events")
    for msg in sub.listen():
        if msg["type"] == "message":
            callback(msg["data"])
```

## Summary

Redis hashes and sets track lobby state and player membership with O(1) reads and writes. Pub/Sub channels broadcast player join, leave, and ready events to all connected clients instantly. TTL on lobby keys ensures abandoned lobbies clean up automatically without a separate janitor process.

