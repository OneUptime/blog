# How to Build a Live Quiz Application with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Quiz, Real-Time

Description: Build a live quiz app with Redis using sorted sets for leaderboards, Pub/Sub for question broadcasting, and atomic Lua scripts for answer validation.

---

Live quiz apps like Kahoot require synchronized question delivery, sub-second answer recording, instant leaderboard updates, and protection against duplicate submissions. Redis handles each of these with sorted sets, Pub/Sub, and Lua scripts.

## Data Model

```bash
# Quiz metadata
HSET quiz:xyz789 title "Tech Trivia" status waiting host_id user-1 question_count 5

# Current question
HSET quiz:xyz789:current question "What does CPU stand for?" options '["Central Processing Unit","Computer Power Unit","Core Processing Utility","Central Power Utility"]' correct_index 0 time_limit 15

# Participant scores (sorted set)
ZADD quiz:xyz789:scores 0 user-101 0 user-102 0 user-103

# Answered set per question (prevents duplicates)
SADD quiz:xyz789:q1:answered user-101
```

## Setup

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

QUIZ_PREFIX = "quiz"
```

## Creating a Quiz

```python
def create_quiz(quiz_id: str, title: str, questions: list[dict], host_id: str) -> str:
    pipe = r.pipeline()
    pipe.hset(f"{QUIZ_PREFIX}:{quiz_id}", mapping={
        "title": title,
        "host_id": host_id,
        "status": "waiting",
        "question_count": len(questions),
        "current_q": 0
    })
    # Store questions
    for i, q in enumerate(questions):
        pipe.set(f"{QUIZ_PREFIX}:{quiz_id}:q{i+1}", json.dumps(q))
    pipe.execute()
    return quiz_id
```

## Broadcasting a Question

```python
def broadcast_question(quiz_id: str, q_index: int):
    question_raw = r.get(f"{QUIZ_PREFIX}:{quiz_id}:q{q_index}")
    if not question_raw:
        raise ValueError(f"Question {q_index} not found")

    question = json.loads(question_raw)
    r.hset(f"{QUIZ_PREFIX}:{quiz_id}", mapping={
        "current_q": q_index,
        "q_started_at": int(time.time()),
        "status": "active"
    })

    payload = {
        "event": "question",
        "q_index": q_index,
        "question": question["question"],
        "options": question["options"],
        "time_limit": question.get("time_limit", 15)
    }
    r.publish(f"{QUIZ_PREFIX}:{quiz_id}:broadcast", json.dumps(payload))
```

## Submitting an Answer

```python
ANSWER_SCRIPT = """
local quiz_key = KEYS[1]
local scores_key = KEYS[2]
local answered_key = KEYS[3]
local channel = KEYS[4]
local user_id = ARGV[1]
local answer_idx = tonumber(ARGV[2])
local correct_idx = tonumber(ARGV[3])
local q_started_at = tonumber(ARGV[4])
local now = tonumber(ARGV[5])
local time_limit = tonumber(ARGV[6])

if now - q_started_at > time_limit then
    return redis.error_reply('TIME_EXPIRED')
end

if redis.call('SISMEMBER', answered_key, user_id) == 1 then
    return redis.error_reply('ALREADY_ANSWERED')
end

redis.call('SADD', answered_key, user_id)

local points = 0
if answer_idx == correct_idx then
    -- Speed bonus: max 1000 points, decreasing with time taken
    local elapsed = now - q_started_at
    points = math.max(500, 1000 - math.floor(elapsed * 30))
    redis.call('ZINCRBY', scores_key, points, user_id)
end

local new_score = redis.call('ZSCORE', scores_key, user_id)
local rank = redis.call('ZREVRANK', scores_key, user_id)
local result = cjson.encode({
    user_id = user_id, points = points,
    total_score = tonumber(new_score), rank = rank + 1,
    correct = (answer_idx == correct_idx)
})
redis.call('PUBLISH', channel, result)
return result
"""

submit_answer = r.register_script(ANSWER_SCRIPT)

def answer_question(quiz_id: str, user_id: str, answer_idx: int, q_index: int) -> dict:
    quiz_key = f"{QUIZ_PREFIX}:{quiz_id}"
    meta = r.hmget(quiz_key, "q_started_at", "current_q")
    question_raw = r.get(f"{QUIZ_PREFIX}:{quiz_id}:q{q_index}")
    question = json.loads(question_raw)

    result = submit_answer(
        keys=[quiz_key, f"{quiz_key}:scores", f"{quiz_key}:q{q_index}:answered", f"{quiz_key}:broadcast"],
        args=[user_id, answer_idx, question["correct_index"], meta[0], int(time.time()), question.get("time_limit", 15)]
    )
    return json.loads(result)
```

## Getting the Live Leaderboard

```python
def get_leaderboard(quiz_id: str, top_n: int = 10) -> list:
    scores = r.zrange(f"{QUIZ_PREFIX}:{quiz_id}:scores", 0, top_n - 1, desc=True, withscores=True)
    return [
        {"rank": i + 1, "user_id": uid, "score": int(score)}
        for i, (uid, score) in enumerate(scores)
    ]
```

## Summary

A Redis live quiz application uses Pub/Sub to deliver synchronized questions to all participants, Lua scripts to atomically validate timing and prevent duplicate answers, and sorted sets for instant real-time leaderboards. Speed-based scoring and time-limited answer windows are handled entirely within Redis without additional backend logic.
