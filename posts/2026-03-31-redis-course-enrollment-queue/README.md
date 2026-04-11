# How to Build a Course Enrollment Queue with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Education, Queue

Description: Handle high-demand course enrollment with a Redis queue that manages waitlists, prevents over-enrollment, and sends instant seat notifications.

---

Popular courses fill up instantly during enrollment periods, creating race conditions where more students are accepted than seats available. A Redis-backed enrollment queue prevents over-enrollment with atomic operations, manages waitlists fairly, and notifies students when seats open up.

## Data Model

```bash
# Course metadata
HSET course:cs101 name "Intro to Computer Science" capacity 30 enrolled 0 status open

# Enrollment set (confirmed students)
SADD course:cs101:enrolled student-1 student-2

# Waitlist sorted set (score = queue position timestamp)
ZADD course:cs101:waitlist 1712000001 student-99 1712000002 student-100
```

## Setup

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

COURSE_PREFIX = "course"
NOTIFICATION_CHANNEL = "enrollment:notifications"
```

## Atomic Enrollment Script

```python
ENROLL_SCRIPT = """
local course_key = KEYS[1]
local enrolled_key = KEYS[2]
local waitlist_key = KEYS[3]
local channel = KEYS[4]
local student_id = ARGV[1]
local now = tonumber(ARGV[2])

-- Check if already enrolled
if redis.call('SISMEMBER', enrolled_key, student_id) == 1 then
    return redis.error_reply('ALREADY_ENROLLED')
end

-- Check if already on waitlist
if redis.call('ZSCORE', waitlist_key, student_id) then
    return redis.error_reply('ALREADY_WAITLISTED')
end

local capacity = tonumber(redis.call('HGET', course_key, 'capacity'))
local enrolled_count = redis.call('SCARD', enrolled_key)

if enrolled_count < capacity then
    -- Seat available - enroll immediately
    redis.call('SADD', enrolled_key, student_id)
    redis.call('HSET', course_key, 'enrolled', enrolled_count + 1)
    local payload = cjson.encode({event = 'enrolled', student_id = student_id, ts = now})
    redis.call('PUBLISH', channel, payload)
    return payload
else
    -- No seats - add to waitlist
    redis.call('ZADD', waitlist_key, now, student_id)
    local position = redis.call('ZRANK', waitlist_key, student_id) + 1
    local payload = cjson.encode({event = 'waitlisted', student_id = student_id, position = position, ts = now})
    redis.call('PUBLISH', channel, payload)
    return payload
end
"""

enroll_student = r.register_script(ENROLL_SCRIPT)

def enroll(course_id: str, student_id: str) -> dict:
    course_key = f"{COURSE_PREFIX}:{course_id}"
    enrolled_key = f"{COURSE_PREFIX}:{course_id}:enrolled"
    waitlist_key = f"{COURSE_PREFIX}:{course_id}:waitlist"

    try:
        result = enroll_student(
            keys=[course_key, enrolled_key, waitlist_key, NOTIFICATION_CHANNEL],
            args=[student_id, int(time.time())]
        )
        return json.loads(result)
    except redis.ResponseError as e:
        raise ValueError(str(e))
```

## Dropping a Course and Advancing the Waitlist

```python
DROP_AND_ADVANCE_SCRIPT = """
local course_key = KEYS[1]
local enrolled_key = KEYS[2]
local waitlist_key = KEYS[3]
local channel = KEYS[4]
local student_id = ARGV[1]
local now = tonumber(ARGV[2])

if redis.call('SREM', enrolled_key, student_id) == 0 then
    return redis.error_reply('NOT_ENROLLED')
end

redis.call('HINCRBY', course_key, 'enrolled', -1)

-- Advance the first person on the waitlist
local next_student = redis.call('ZPOPMIN', waitlist_key, 1)
if #next_student > 0 then
    local next_id = next_student[1]
    redis.call('SADD', enrolled_key, next_id)
    redis.call('HINCRBY', course_key, 'enrolled', 1)
    local payload = cjson.encode({event = 'seat_opened', student_id = next_id, from_waitlist = true, ts = now})
    redis.call('PUBLISH', channel, payload)
    return payload
end

return cjson.encode({event = 'dropped', student_id = student_id, ts = now})
"""

drop_course = r.register_script(DROP_AND_ADVANCE_SCRIPT)

def drop(course_id: str, student_id: str) -> dict:
    course_key = f"{COURSE_PREFIX}:{course_id}"
    enrolled_key = f"{COURSE_PREFIX}:{course_id}:enrolled"
    waitlist_key = f"{COURSE_PREFIX}:{course_id}:waitlist"

    result = drop_course(
        keys=[course_key, enrolled_key, waitlist_key, NOTIFICATION_CHANNEL],
        args=[student_id, int(time.time())]
    )
    return json.loads(result)
```

## Getting Enrollment Status

```python
def get_enrollment_status(course_id: str, student_id: str) -> dict:
    enrolled_key = f"{COURSE_PREFIX}:{course_id}:enrolled"
    waitlist_key = f"{COURSE_PREFIX}:{course_id}:waitlist"
    course_info = r.hgetall(f"{COURSE_PREFIX}:{course_id}")

    if r.sismember(enrolled_key, student_id):
        return {"status": "enrolled", "course": course_info}

    position = r.zrank(waitlist_key, student_id)
    if position is not None:
        return {"status": "waitlisted", "position": position + 1, "course": course_info}

    seats_available = int(course_info.get("capacity", 0)) - r.scard(enrolled_key)
    return {"status": "not_enrolled", "seats_available": max(0, seats_available)}
```

## Summary

A Redis course enrollment queue uses atomic Lua scripts to prevent over-enrollment by checking seat availability and adding students to an enrollment set or a sorted-set waitlist in a single operation. When a student drops, the waitlist is automatically advanced and a notification is published, all within a single atomic script execution.
