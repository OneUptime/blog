# How to Build a Real-Time Classroom Poll with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Education, Poll

Description: Build live classroom polls with Redis that let instructors gauge student understanding instantly using Pub/Sub for vote delivery and sorted sets for results.

---

Live classroom polls help instructors check comprehension in real time - but they need to work instantly, without page refreshes, and at the scale of a large lecture hall. Redis handles vote recording, duplicate prevention, and live result broadcasting for up to thousands of simultaneous participants.

## Setup

```python
import redis
import json
import time
import uuid

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

POLL_PREFIX = "classpoll"
CHANNEL_PREFIX = "classpoll:room"
```

## Creating a Classroom Poll

```python
def create_class_poll(
    room_id: str,
    instructor_id: str,
    question: str,
    options: list[str],
    duration_seconds: int = 60,
    allow_multiple: bool = False
) -> str:
    poll_id = str(uuid.uuid4())[:8]
    expires_at = int(time.time()) + duration_seconds

    pipe = r.pipeline()
    meta_key = f"{POLL_PREFIX}:{room_id}:{poll_id}"
    pipe.hset(meta_key, mapping={
        "question": question,
        "options": json.dumps(options),
        "instructor_id": instructor_id,
        "expires_at": expires_at,
        "duration": duration_seconds,
        "allow_multiple": int(allow_multiple),
        "status": "active"
    })

    # Initialize vote counts
    votes_key = f"{POLL_PREFIX}:{room_id}:{poll_id}:votes"
    pipe.hset(votes_key, mapping={opt: 0 for opt in options})

    # Set TTL so keys auto-cleanup
    pipe.expireat(meta_key, expires_at + 3600)
    pipe.expireat(votes_key, expires_at + 3600)

    pipe.execute()

    # Broadcast poll to the room
    r.publish(f"{CHANNEL_PREFIX}:{room_id}", json.dumps({
        "event": "poll_started",
        "poll_id": poll_id,
        "question": question,
        "options": options,
        "expires_at": expires_at
    }))

    return poll_id
```

## Casting a Vote

```python
VOTE_SCRIPT = """
local meta_key = KEYS[1]
local votes_key = KEYS[2]
local voters_key = KEYS[3]
local channel = KEYS[4]
local student_id = ARGV[1]
local option = ARGV[2]
local now = tonumber(ARGV[3])
local allow_multiple = tonumber(ARGV[4])

local expires_at = tonumber(redis.call('HGET', meta_key, 'expires_at'))
if now > expires_at then
    return redis.error_reply('POLL_CLOSED')
end

if allow_multiple == 0 and redis.call('SISMEMBER', voters_key, student_id) == 1 then
    return redis.error_reply('ALREADY_VOTED')
end

if redis.call('HEXISTS', votes_key, option) == 0 then
    return redis.error_reply('INVALID_OPTION')
end

redis.call('SADD', voters_key, student_id)
local new_count = redis.call('HINCRBY', votes_key, option, 1)

local all_votes = redis.call('HGETALL', votes_key)
local totals = {}
local grand_total = 0
for i = 1, #all_votes, 2 do
    totals[all_votes[i]] = tonumber(all_votes[i+1])
    grand_total = grand_total + tonumber(all_votes[i+1])
end

local payload = cjson.encode({
    event = 'vote',
    option = option,
    totals = totals,
    total_votes = grand_total
})
redis.call('PUBLISH', channel, payload)
return payload
"""

cast_vote = r.register_script(VOTE_SCRIPT)

def vote(room_id: str, poll_id: str, student_id: str, option: str) -> dict:
    meta_key = f"{POLL_PREFIX}:{room_id}:{poll_id}"
    votes_key = f"{POLL_PREFIX}:{room_id}:{poll_id}:votes"
    voters_key = f"{POLL_PREFIX}:{room_id}:{poll_id}:voters"
    channel = f"{CHANNEL_PREFIX}:{room_id}"
    meta = r.hgetall(meta_key)
    allow_multiple = int(meta.get("allow_multiple", 0))

    result = cast_vote(
        keys=[meta_key, votes_key, voters_key, channel],
        args=[student_id, option, int(time.time()), allow_multiple]
    )
    return json.loads(result)
```

## Getting Live Results

```python
def get_results(room_id: str, poll_id: str) -> dict:
    meta = r.hgetall(f"{POLL_PREFIX}:{room_id}:{poll_id}")
    votes = r.hgetall(f"{POLL_PREFIX}:{room_id}:{poll_id}:votes")
    voter_count = r.scard(f"{POLL_PREFIX}:{room_id}:{poll_id}:voters")
    total_votes = sum(int(v) for v in votes.values())

    return {
        "question": meta.get("question"),
        "total_voters": voter_count,
        "total_votes": total_votes,
        "results": {
            opt: {
                "count": int(count),
                "percent": round(int(count) / total_votes * 100, 1) if total_votes > 0 else 0
            }
            for opt, count in votes.items()
        }
    }
```

## Watching as an Instructor

```python
def instructor_dashboard(room_id: str):
    sub = r.pubsub()
    sub.subscribe(f"{CHANNEL_PREFIX}:{room_id}")

    for message in sub.listen():
        if message["type"] != "message":
            continue
        data = json.loads(message["data"])
        if data.get("event") == "vote":
            print(f"\nTotal votes: {data['total_votes']}")
            for opt, count in data["totals"].items():
                bar = "#" * count
                print(f"  {opt:20s} [{bar:<30s}] {count}")
```

## Summary

A Redis classroom poll delivers real-time engagement by using short-TTL poll keys that auto-expire, atomic Lua scripts to validate options and prevent duplicate votes, and Pub/Sub to push updated tallies to all connected browsers after every vote. Instructors see a live histogram update within milliseconds of each student response.
