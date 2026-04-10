# How to Build a Real-Time Polling System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Poll, Real-Time

Description: Build a real-time polling system with Redis using hashes for vote counts, sets to prevent double voting, and Pub/Sub to broadcast live results.

---

Real-time polls are everywhere - product feedback, live event surveys, conference Q&A. The key requirements are fast vote recording, duplicate vote prevention, and instant result delivery to all viewers. Redis handles all three with minimal complexity.

## Data Model

Each poll is a hash storing option vote counts, with a set tracking which users have already voted:

```bash
# Votes hash
HSET poll:abc123:votes "Option A" 0 "Option B" 0 "Option C" 0

# Voter set (prevents duplicates)
SADD poll:abc123:voters user-101

# Poll metadata
HSET poll:abc123 question "Which feature should we build next?" status active expires 1711990000
```

## Recording a Vote

Use a Lua script to atomically check for duplicates and increment the count:

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

VOTE_SCRIPT = """
local voters_key = KEYS[1]
local votes_key = KEYS[2]
local channel = KEYS[3]
local user_id = ARGV[1]
local option = ARGV[2]
local now = tonumber(ARGV[3])

if redis.call('SISMEMBER', voters_key, user_id) == 1 then
    return redis.error_reply('ALREADY_VOTED')
end

local expires = tonumber(redis.call('HGET',
    string.gsub(votes_key, ':votes', ''), 'expires'))
if now > expires then
    return redis.error_reply('POLL_CLOSED')
end

redis.call('SADD', voters_key, user_id)
local new_count = redis.call('HINCRBY', votes_key, option, 1)

local totals = redis.call('HGETALL', votes_key)
local result = {}
for i = 1, #totals, 2 do
    result[totals[i]] = tonumber(totals[i+1])
end

local payload = cjson.encode({option = option, totals = result, ts = now})
redis.call('PUBLISH', channel, payload)
return payload
"""

cast_vote = r.register_script(VOTE_SCRIPT)

def vote(poll_id: str, user_id: str, option: str) -> dict:
    voters_key = f"poll:{poll_id}:voters"
    votes_key = f"poll:{poll_id}:votes"
    channel = f"poll:{poll_id}:updates"

    try:
        result = cast_vote(
            keys=[voters_key, votes_key, channel],
            args=[user_id, option, int(time.time())]
        )
        return json.loads(result)
    except redis.ResponseError as e:
        raise ValueError(str(e))
```

## Creating a Poll

```python
def create_poll(poll_id: str, question: str, options: list[str], duration_seconds: int = 300) -> str:
    expires = int(time.time()) + duration_seconds
    votes_key = f"poll:{poll_id}:votes"
    meta_key = f"poll:{poll_id}"

    pipe = r.pipeline()
    pipe.hset(meta_key, mapping={
        "question": question,
        "status": "active",
        "expires": expires,
        "created_at": int(time.time())
    })
    pipe.hset(votes_key, mapping={opt: 0 for opt in options})
    pipe.expireat(meta_key, expires + 60)
    pipe.expireat(votes_key, expires + 60)
    pipe.execute()
    return poll_id
```

## Subscribing to Live Results

```python
def watch_poll(poll_id: str):
    sub = r.pubsub()
    sub.subscribe(f"poll:{poll_id}:updates")

    print(f"Watching poll {poll_id}...")
    for message in sub.listen():
        if message["type"] == "message":
            data = json.loads(message["data"])
            print(f"\nNew vote for: {data['option']}")
            for opt, count in data["totals"].items():
                print(f"  {opt}: {count}")
```

## Getting Current Results

```python
def get_results(poll_id: str) -> dict:
    meta = r.hgetall(f"poll:{poll_id}")
    votes = r.hgetall(f"poll:{poll_id}:votes")
    total_votes = sum(int(v) for v in votes.values())

    return {
        "question": meta.get("question"),
        "total_votes": total_votes,
        "options": {
            opt: {
                "count": int(count),
                "percent": round(int(count) / total_votes * 100, 1) if total_votes > 0 else 0
            }
            for opt, count in votes.items()
        }
    }
```

## Closing a Poll

```python
def close_poll(poll_id: str) -> dict:
    r.hset(f"poll:{poll_id}", "status", "closed")
    results = get_results(poll_id)
    r.publish(f"poll:{poll_id}:updates", json.dumps({"event": "closed", **results}))
    return results
```

## Summary

A Redis polling system combines hashes for vote tallies, sets for duplicate-vote prevention, and Pub/Sub for live result broadcasting. Lua scripts ensure vote counting and duplicate checks happen atomically, and auto-expiring keys handle cleanup without a scheduled job.
