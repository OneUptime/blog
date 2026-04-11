# How to Build a News Feed (Timeline) System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, News Feed, Timeline, Social Media, Sorted Set

Description: Learn how to build a scalable news feed and activity timeline system using Redis Sorted Sets with fan-out on write and push-pull hybrid strategies.

---

## News Feed Architecture Overview

A news feed shows a user the recent posts from people they follow, sorted chronologically. Two main strategies exist:

- Fan-out on write (push): When Alice posts, push the post ID to every follower's feed immediately. Fast reads, expensive writes.
- Fan-out on read (pull): When a user opens their feed, aggregate posts from all followed users. Simple writes, expensive reads.

Redis supports both patterns efficiently.

## Data Model

```text
post:{post_id}           -> Hash: author_id, content, timestamp, likes
user:{user_id}:following -> Set: user IDs this user follows
user:{user_id}:followers -> Set: user IDs that follow this user
feed:{user_id}           -> Sorted Set: post_id as member, timestamp as score
timeline:{user_id}       -> Sorted Set: author's own posts (used in pull/hybrid models)
```

## Setting Up the Data Structures

```python
from redis import Redis
import time
import uuid

r = Redis(decode_responses=True)

def create_post(author_id: int, content: str) -> str:
    post_id = str(uuid.uuid4())[:12]
    r.hset(f"post:{post_id}", mapping={
        "author_id": author_id,
        "content": content,
        "timestamp": int(time.time()),
        "likes": 0
    })
    return post_id

def follow_user(follower_id: int, followee_id: int):
    r.sadd(f"user:{follower_id}:following", followee_id)
    r.sadd(f"user:{followee_id}:followers", follower_id)

def unfollow_user(follower_id: int, followee_id: int):
    r.srem(f"user:{follower_id}:following", followee_id)
    r.srem(f"user:{followee_id}:followers", follower_id)
```

## Fan-Out on Write (Push Model)

When a user posts, push the post ID into every follower's feed Sorted Set:

```python
FEED_MAX_LENGTH = 1000  # Keep last 1000 posts per user feed

def publish_post(author_id: int, content: str) -> str:
    post_id = create_post(author_id, content)
    timestamp = time.time()

    followers = r.smembers(f"user:{author_id}:followers")

    if followers:
        pipe = r.pipeline(transaction=False)
        for follower_id in followers:
            feed_key = f"feed:{follower_id}"
            pipe.zadd(feed_key, {post_id: timestamp})
            pipe.zremrangebyrank(feed_key, 0, -(FEED_MAX_LENGTH + 1))
        pipe.execute()

    r.zadd(f"feed:{author_id}", {post_id: timestamp})
    return post_id

def get_feed(user_id: int, page: int = 0, page_size: int = 20) -> list:
    feed_key = f"feed:{user_id}"
    start = page * page_size
    post_ids = r.zrevrange(feed_key, start, start + page_size - 1)

    if not post_ids:
        return []

    pipe = r.pipeline()
    for post_id in post_ids:
        pipe.hgetall(f"post:{post_id}")
    raw_posts = pipe.execute()

    return [
        {**post, "post_id": pid}
        for pid, post in zip(post_ids, raw_posts)
        if post
    ]
```

## Fan-Out on Read (Pull Model)

For users with many followers, writing to millions of feeds is impractical. Use pull for high-follower accounts. Each author maintains their own timeline Sorted Set:

```python
def publish_post_pull(author_id: int, content: str) -> str:
    post_id = create_post(author_id, content)
    timestamp = time.time()
    r.zadd(f"timeline:{author_id}", {post_id: timestamp})
    return post_id

def get_feed_pull(user_id: int, page: int = 0, page_size: int = 20) -> list:
    following = r.smembers(f"user:{user_id}:following")
    if not following:
        return []

    all_posts = []
    pipe = r.pipeline()
    for fid in following:
        pipe.zrevrange(f"timeline:{fid}", 0, 49, withscores=True)
    results = pipe.execute()

    for post_ids_with_scores in results:
        for post_id, score in post_ids_with_scores:
            all_posts.append((score, post_id))

    all_posts.sort(key=lambda x: x[0], reverse=True)
    page_posts = all_posts[page * page_size: (page + 1) * page_size]

    pipe = r.pipeline()
    for _, post_id in page_posts:
        pipe.hgetall(f"post:{post_id}")
    raw_posts = pipe.execute()

    return [
        {**post, "post_id": pid}
        for (_, pid), post in zip(page_posts, raw_posts)
        if post
    ]
```

## Hybrid Model - Push/Pull Combined

```python
CELEBRITY_THRESHOLD = 10000

def smart_publish(author_id: int, content: str) -> str:
    post_id = create_post(author_id, content)
    timestamp = time.time()
    follower_count = r.scard(f"user:{author_id}:followers")

    if follower_count <= CELEBRITY_THRESHOLD:
        followers = r.smembers(f"user:{author_id}:followers")
        pipe = r.pipeline(transaction=False)
        for fid in followers:
            pipe.zadd(f"feed:{fid}", {post_id: timestamp})
            pipe.zremrangebyrank(f"feed:{fid}", 0, -(FEED_MAX_LENGTH + 1))
        pipe.execute()
    else:
        r.zadd(f"timeline:{author_id}", {post_id: timestamp})

    return post_id
```

## Like and Engagement Tracking

```python
def like_post(user_id: int, post_id: str):
    added = r.sadd(f"post:{post_id}:liked_by", user_id)
    if added:
        r.hincrby(f"post:{post_id}", "likes", 1)

def get_post_with_engagement(post_id: str) -> dict:
    post = r.hgetall(f"post:{post_id}")
    post["liked_by_count"] = r.scard(f"post:{post_id}:liked_by")
    return post
```

## Summary

Redis Sorted Sets with Unix timestamps as scores provide a natural chronological feed structure with O(log n) insertion and O(log n + page_size) retrieval. Fan-out on write scales read performance at the cost of write overhead, making it ideal for users with moderate follower counts. A hybrid push/pull model for accounts with large followings balances write amplification with read latency.
