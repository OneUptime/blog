# How to Build a Call Queue System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Telecom, Queue

Description: Build a priority-based call queue system with Redis using sorted sets for caller ordering, Pub/Sub for agent notifications, and real-time wait time estimation.

---

Contact centers need call queues that handle hundreds of simultaneous callers, route based on priority, and give callers accurate wait time estimates. Redis sorted sets provide the ordering, Pub/Sub notifies available agents, and real-time position tracking enables accurate ETA calculations.

## Data Model

```bash
# Call queue sorted set (score = priority + fractional timestamp)
# Lower score = higher priority. Example: priority 1, entered_at 1711900001
ZADD queue:support 1.900001 "abc12345"

# Caller info stored as JSON string
SET call:abc12345 '{"id":"abc12345","caller_id":"+15551234567","queue":"support","priority":1,"entered_at":1711900001,"status":"queued"}'

# Agent availability set
SADD agents:support:available agent-42 agent-43
```

## Setup

```python
import redis
import json
import time
import uuid

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

QUEUE_PREFIX = "queue"
CALL_PREFIX = "call"
AGENTS_PREFIX = "agents"
CHANNEL_PREFIX = "callcenter"
```

## Enqueuing a Call

```python
def enqueue_call(caller_id: str, queue_name: str, priority: int = 5) -> str:
    call_id = str(uuid.uuid4())[:8]
    entered_at = time.time()

    # Lower score = higher priority. Use priority as integer part, time as decimal
    score = priority + (entered_at % 100000) / 1000000

    call_data = {
        "id": call_id,
        "caller_id": caller_id,
        "queue": queue_name,
        "priority": priority,
        "entered_at": entered_at,
        "status": "queued"
    }

    pipe = r.pipeline()
    pipe.set(f"{CALL_PREFIX}:{call_id}", json.dumps(call_data))
    pipe.zadd(f"{QUEUE_PREFIX}:{queue_name}", {call_id: score})
    pipe.execute()

    r.publish(f"{CHANNEL_PREFIX}:{queue_name}:new_call", json.dumps({
        "event": "call_queued",
        "call_id": call_id,
        "queue_depth": r.zcard(f"{QUEUE_PREFIX}:{queue_name}")
    }))

    return call_id
```

## Getting Queue Position and Wait Time

```python
def get_queue_position(call_id: str, queue_name: str) -> dict:
    position = r.zrank(f"{QUEUE_PREFIX}:{queue_name}", call_id)
    if position is None:
        return {"status": "not_in_queue"}

    # Estimate wait time based on average handle time
    avg_handle_time_seconds = get_avg_handle_time(queue_name)
    available_agents = r.scard(f"{AGENTS_PREFIX}:{queue_name}:available")
    active_agents = max(1, available_agents)
    estimated_wait = (position * avg_handle_time_seconds) / active_agents

    return {
        "position": position + 1,
        "calls_ahead": position,
        "estimated_wait_seconds": int(estimated_wait),
        "estimated_wait_display": f"{int(estimated_wait // 60)}m {int(estimated_wait % 60)}s"
    }

def get_avg_handle_time(queue_name: str) -> float:
    key = f"stats:{queue_name}:avg_handle_time"
    val = r.get(key)
    return float(val) if val else 240  # Default 4 minutes
```

## Agent Picks Up a Call

```python
ASSIGN_CALL_SCRIPT = """
local queue_key = KEYS[1]
local agents_available_key = KEYS[2]
local channel = KEYS[3]
local agent_id = ARGV[1]
local now = ARGV[2]

local call_id = redis.call('ZPOPMIN', queue_key, 1)
if #call_id == 0 then
    return redis.error_reply('QUEUE_EMPTY')
end

local cid = call_id[1]
redis.call('SREM', agents_available_key, agent_id)

local payload = cjson.encode({
    event = 'call_assigned',
    call_id = cid,
    agent_id = agent_id,
    ts = now
})
redis.call('PUBLISH', channel, payload)
return cid
"""

assign_call = r.register_script(ASSIGN_CALL_SCRIPT)

def agent_ready(agent_id: str, queue_name: str) -> str | None:
    r.sadd(f"{AGENTS_PREFIX}:{queue_name}:available", agent_id)

    # Try to assign immediately if calls are waiting
    if r.zcard(f"{QUEUE_PREFIX}:{queue_name}") > 0:
        try:
            call_id = assign_call(
                keys=[f"{QUEUE_PREFIX}:{queue_name}",
                      f"{AGENTS_PREFIX}:{queue_name}:available",
                      f"{CHANNEL_PREFIX}:{queue_name}:assignments"],
                args=[agent_id, int(time.time())]
            )
            return call_id.decode() if isinstance(call_id, bytes) else call_id
        except redis.ResponseError:
            return None
    return None
```

## Completing a Call

```python
def complete_call(agent_id: str, call_id: str, queue_name: str, handle_time_seconds: int):
    call_raw = r.get(f"{CALL_PREFIX}:{call_id}")
    if call_raw:
        call = json.loads(call_raw)
        call["status"] = "completed"
        call["completed_at"] = int(time.time())
        call["handle_time"] = handle_time_seconds
        r.setex(f"{CALL_PREFIX}:{call_id}", 86400, json.dumps(call))

    # Update rolling average handle time
    stats_key = f"stats:{queue_name}:handle_times"
    r.lpush(stats_key, handle_time_seconds)
    r.ltrim(stats_key, 0, 99)  # Keep last 100 calls

    times = [int(t) for t in r.lrange(stats_key, 0, -1)]
    avg = sum(times) / len(times)
    r.set(f"stats:{queue_name}:avg_handle_time", avg)

    # Mark agent as available again
    r.sadd(f"{AGENTS_PREFIX}:{queue_name}:available", agent_id)
```

## Summary

A Redis call queue system uses sorted sets with composite priority-timestamp scores to maintain fair, priority-aware ordering, atomic Lua scripts to simultaneously pop a call and remove agent availability, and Pub/Sub to notify supervisors of queue events in real time. Rolling average handle times enable accurate wait time estimates for callers.
