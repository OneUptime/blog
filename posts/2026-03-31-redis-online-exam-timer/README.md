# How to Build an Online Exam Timer with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Education, Timer

Description: Build tamper-proof online exam timers with Redis using server-side TTLs, Pub/Sub for countdown broadcasts, and atomic submission validation.

---

Online exam timers cannot rely on the client. JavaScript timers can be paused, manipulated, or reset. The authoritative time must live server-side. Redis TTLs and server timestamps make this straightforward: the timer state lives in Redis, not in the browser.

## Architecture

- The exam session is a Redis key with a TTL equal to the exam duration.
- The server derives remaining time from `TTL` - no client-reported values are trusted.
- Periodic Pub/Sub messages push countdown ticks to connected browsers.
- Submission is only accepted while the key is still alive.

## Setup

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

SESSION_PREFIX = "exam:session"
CHANNEL_PREFIX = "exam:timer"
SUBMISSION_PREFIX = "exam:submission"
```

## Starting an Exam Session

```python
def start_exam(exam_id: str, student_id: str, duration_seconds: int) -> dict:
    session_key = f"{SESSION_PREFIX}:{exam_id}:{student_id}"

    # Prevent duplicate starts
    if r.exists(session_key):
        raise ValueError("Exam already in progress for this student")

    started_at = int(time.time())
    session = {
        "exam_id": exam_id,
        "student_id": student_id,
        "started_at": started_at,
        "duration": duration_seconds,
        "status": "active"
    }

    r.setex(session_key, duration_seconds, json.dumps(session))

    return {
        "session_key": session_key,
        "started_at": started_at,
        "ends_at": started_at + duration_seconds,
        "duration_seconds": duration_seconds
    }
```

## Getting Remaining Time

```python
def get_remaining_time(exam_id: str, student_id: str) -> int:
    session_key = f"{SESSION_PREFIX}:{exam_id}:{student_id}"
    ttl = r.ttl(session_key)
    if ttl == -2:
        return 0  # Key does not exist - exam expired or not started
    if ttl == -1:
        return -1  # Key has no TTL (should not happen)
    return ttl
```

## Broadcasting Countdown Ticks

Run this in a background thread or scheduled task:

```python
def broadcast_countdown(exam_id: str, student_id: str):
    channel = f"{CHANNEL_PREFIX}:{exam_id}:{student_id}"

    while True:
        remaining = get_remaining_time(exam_id, student_id)
        if remaining <= 0:
            r.publish(channel, json.dumps({"event": "expired", "remaining": 0}))
            break

        r.publish(channel, json.dumps({
            "event": "tick",
            "remaining": remaining,
            "ts": int(time.time())
        }))

        # Warn at 10 and 5 minutes
        if remaining in (600, 300):
            r.publish(channel, json.dumps({
                "event": "warning",
                "remaining": remaining,
                "message": f"{remaining // 60} minutes remaining"
            }))

        time.sleep(1)
```

## Submitting Answers

```python
def submit_exam(exam_id: str, student_id: str, answers: dict) -> dict:
    session_key = f"{SESSION_PREFIX}:{exam_id}:{student_id}"
    submission_key = f"{SUBMISSION_PREFIX}:{exam_id}:{student_id}"

    # Prevent duplicate submissions
    if r.exists(submission_key):
        raise ValueError("Already submitted")

    remaining = r.ttl(session_key)
    if remaining == -2:
        raise ValueError("Exam time has expired - submission rejected")

    submitted_at = int(time.time())
    submission = {
        "exam_id": exam_id,
        "student_id": student_id,
        "answers": answers,
        "submitted_at": submitted_at,
        "time_remaining_at_submission": max(0, remaining)
    }

    # Store submission and delete the active session
    pipe = r.pipeline()
    pipe.set(submission_key, json.dumps(submission))
    pipe.delete(session_key)
    pipe.execute()

    r.publish(f"{CHANNEL_PREFIX}:{exam_id}:{student_id}", json.dumps({
        "event": "submitted",
        "submitted_at": submitted_at
    }))

    return submission
```

## Admin: Extending Time

```python
def extend_exam_time(exam_id: str, student_id: str, extra_seconds: int) -> int:
    session_key = f"{SESSION_PREFIX}:{exam_id}:{student_id}"
    current_ttl = r.ttl(session_key)
    if current_ttl <= 0:
        raise ValueError("No active exam session found")

    new_ttl = current_ttl + extra_seconds
    r.expire(session_key, new_ttl)
    return new_ttl
```

## Summary

A Redis exam timer stores session state with a TTL equal to the exam duration, making the server the sole source of truth for remaining time. Remaining time is derived from the key's TTL using `TTL`, submissions are rejected after key expiry, and Pub/Sub delivers countdown ticks to the browser without trusting any client-reported time.
