# How to Build a Distributed State Machine with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, State Machine, Distributed System, Workflow, Backend

Description: Build a distributed state machine with Redis strings and Lua scripts to manage workflow states with atomic transitions and conflict-free concurrency across services.

---

In distributed systems, multiple services may try to advance the same workflow concurrently. A Redis-backed state machine uses atomic compare-and-swap operations to ensure transitions are valid and conflict-free.

## Defining States and Transitions

Start by defining the valid state transitions as a map:

```python
TRANSITIONS = {
    "pending":    ["processing"],
    "processing": ["completed", "failed"],
    "failed":     ["pending"],   # allow retry
    "completed":  [],            # terminal
}
```

## Storing State in Redis

Use a Redis hash per workflow instance to store state and metadata:

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def create_workflow(workflow_id: str, initial_state: str = "pending"):
    key = f"workflow:{workflow_id}"
    r.hset(key, mapping={
        "state": initial_state,
        "created_at": str(time.time()),
        "updated_at": str(time.time()),
    })
```

## Atomic Transition with Lua Script

Use a Lua script to atomically check the current state and only apply the transition if it is valid:

```python
TRANSITION_SCRIPT = """
local key = KEYS[1]
local from_state = ARGV[1]
local to_state = ARGV[2]
local now = ARGV[3]

local current = redis.call('HGET', key, 'state')
if current ~= from_state then
    return 0
end
redis.call('HSET', key, 'state', to_state, 'updated_at', now)
return 1
"""

transition_fn = r.register_script(TRANSITION_SCRIPT)

def transition(workflow_id: str, from_state: str, to_state: str) -> bool:
    if to_state not in TRANSITIONS.get(from_state, []):
        raise ValueError(f"Invalid transition: {from_state} -> {to_state}")
    key = f"workflow:{workflow_id}"
    result = transition_fn(keys=[key], args=[from_state, to_state, str(time.time())])
    return result == 1
```

## Appending Transition History

Log every state change to a Redis stream for audit:

```python
def transition_with_history(workflow_id: str, from_state: str, to_state: str, actor: str) -> bool:
    success = transition(workflow_id, from_state, to_state)
    if success:
        r.xadd(f"workflow:history:{workflow_id}", {
            "from": from_state,
            "to": to_state,
            "actor": actor,
            "timestamp": str(time.time()),
        })
    return success
```

## Querying Workflows by State

Use a Redis set per state to index workflows for fast queries:

```python
def transition_indexed(workflow_id: str, from_state: str, to_state: str) -> bool:
    success = transition(workflow_id, from_state, to_state)
    if success:
        pipe = r.pipeline()
        pipe.srem(f"workflows:state:{from_state}", workflow_id)
        pipe.sadd(f"workflows:state:{to_state}", workflow_id)
        pipe.execute()
    return success

def get_workflows_in_state(state: str) -> set:
    return r.smembers(f"workflows:state:{state}")
```

## Summary

Redis Lua scripts guarantee atomic compare-and-swap transitions that prevent race conditions in concurrent distributed workflows. State indexes built from sets allow O(N) membership listing via `SMEMBERS` and O(1) single-member checks via `SISMEMBER`. Streams provide a full, ordered history of every transition for debugging and audit.

