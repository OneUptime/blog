# How to Build a Content Voting System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Voting, Sorted Set, Counter

Description: Build an upvote/downvote system with Redis - track per-user votes, compute net scores atomically, and rank content by score using Sorted Sets.

---

A content voting system (upvotes and downvotes like Reddit) needs atomic vote tracking, duplicate prevention, and fast score-based ranking. Redis handles all three with Sets and Sorted Sets.

## Data Model

```text
votes:{contentId}:up    -> Set of user IDs who upvoted
votes:{contentId}:down  -> Set of user IDs who downvoted
content:scores          -> Sorted Set of contentId -> net score
```

## Casting a Vote

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def vote(content_id, user_id, direction):
    """direction: 'up' or 'down'"""
    up_key = f"votes:{content_id}:up"
    down_key = f"votes:{content_id}:down"
    opposite = "down" if direction == "up" else "up"
    opp_key = f"votes:{content_id}:{opposite}"
    this_key = f"votes:{content_id}:{direction}"

    pipe = r.pipeline()

    # Remove any existing opposite vote
    if r.sismember(opp_key, user_id):
        pipe.srem(opp_key, user_id)
        score_delta = 2 if direction == "up" else -2
    elif r.sismember(this_key, user_id):
        # User is un-voting
        pipe.srem(this_key, user_id)
        score_delta = -1 if direction == "up" else 1
        pipe.zincrby("content:scores", score_delta, content_id)
        pipe.execute()
        return "removed"
    else:
        score_delta = 1 if direction == "up" else -1

    pipe.sadd(this_key, user_id)
    pipe.zincrby("content:scores", score_delta, content_id)
    pipe.execute()
    return direction
```

## Getting Vote Counts and User Vote

```python
def get_vote_counts(content_id):
    pipe = r.pipeline()
    pipe.scard(f"votes:{content_id}:up")
    pipe.scard(f"votes:{content_id}:down")
    up, down = pipe.execute()
    return {"up": up, "down": down, "score": up - down}

def get_user_vote(content_id, user_id):
    pipe = r.pipeline()
    pipe.sismember(f"votes:{content_id}:up", user_id)
    pipe.sismember(f"votes:{content_id}:down", user_id)
    is_up, is_down = pipe.execute()
    if is_up:
        return "up"
    if is_down:
        return "down"
    return None
```

## Ranking Content by Score

```python
def get_top_content(limit=25, offset=0):
    return r.zrevrange("content:scores", offset, offset + limit - 1, withscores=True)

def get_content_rank(content_id):
    rank = r.zrevrank("content:scores", content_id)
    return rank + 1 if rank is not None else None
```

## Time-Decayed Score (Hot Content)

Combine vote score with age for a Reddit-style "hot" ranking:

```python
import math

def compute_hot_score(content_id, post_timestamp):
    counts = get_vote_counts(content_id)
    score = counts["up"] - counts["down"]
    order = math.log10(max(abs(score), 1))
    sign = 1 if score > 0 else (-1 if score < 0 else 0)
    age = post_timestamp - 1134028003  # Reddit epoch
    return round(sign * order + age / 45000, 7)

def update_hot_score(content_id, post_timestamp):
    hot = compute_hot_score(content_id, post_timestamp)
    r.zadd("content:hot", {content_id: hot})
```

## Example Usage

```bash
SADD votes:post:1:up user:alice user:bob
SADD votes:post:1:down user:carol
ZADD content:scores 1 post:1

# Get score
ZSCORE content:scores post:1    # 1.0

# Top 10 content
ZREVRANGE content:scores 0 9 WITHSCORES
```

## Summary

Redis Sets prevent duplicate votes while Sorted Sets enable instant score-based ranking. Atomic ZINCRBY keeps scores consistent even under concurrent votes. For sophisticated ranking algorithms like Reddit's hot score, compute the value in your application layer and store it in a Sorted Set for fast retrieval.
