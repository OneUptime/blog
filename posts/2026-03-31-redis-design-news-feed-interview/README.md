# How to Design a News Feed Using Redis in a System Design Interview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, System Design, News Feed, Interview, Cache

Description: Design a scalable news feed system using Redis in a system design interview, covering fan-out strategies, caching, and pagination.

---

News feed design is a popular system design interview question asked at companies like Twitter, Instagram, and LinkedIn. Redis plays a central role in any performant feed system. This post walks through the design and how to explain it clearly.

## Define the Requirements

Clarify before designing:
- Is this a social follow model (users follow other users)?
- How many followers can a user have? (affects fan-out strategy)
- Do we need real-time updates or eventual consistency?
- How many posts should be visible (infinite scroll or limited)?

## Fan-Out Strategies

**Fan-out on Write (Push Model):** When a user posts, push the post ID into each follower's feed list immediately.

**Fan-out on Read (Pull Model):** When a user requests their feed, fetch posts from all followed users and merge.

For most cases, a **hybrid model** works best:
- Fan-out on write for users with fewer than ~10,000 followers
- Fan-out on read for "celebrities" with millions of followers

## Feed Storage Using Redis Lists

Each user's feed is a Redis list of post IDs, capped at a fixed size:

```bash
# Fan-out: push post_id to each follower's feed
LPUSH feed:user:42 post_id_12345
LTRIM feed:user:42 0 999  # keep only 1000 most recent posts

# Read feed page 1
LRANGE feed:user:42 0 19  # returns 20 post IDs

# Read feed page 2
LRANGE feed:user:42 20 39
```

## Fetching Post Details

Feed lists only store post IDs. Use a Redis hash or string to cache the post content:

```bash
# Cache post content
HSET post:12345 author "alice" text "Hello world" timestamp 1711900000
EXPIRE post:12345 86400  # TTL 24 hours

# In application: fetch all post IDs, then batch-get posts
HMGET post:12345 author text timestamp
```

For efficiency, use pipelining to fetch multiple posts in one round trip:

```python
pipe = redis.pipeline()
for post_id in post_ids:
    pipe.hgetall(f"post:{post_id}")
results = pipe.execute()
```

## Handling Celebrities (Fan-out on Read)

For users with millions of followers, fan-out on write would be too slow:

```python
def get_feed(user_id):
    # Get pre-built feed (post IDs) for normal users
    feed_ids = redis.lrange(f"feed:user:{user_id}", 0, 99)

    # For each celebrity this user follows
    for celebrity_id in get_followed_celebrities(user_id):
        recent_posts = redis.lrange(f"posts:{celebrity_id}", 0, 9)
        feed_ids.extend(recent_posts)

    # Fetch post details and sort by timestamp
    posts = [get_post(post_id) for post_id in feed_ids]
    return sorted(posts, key=lambda p: p["timestamp"], reverse=True)[:20]
```

## Caching Aggregated Feeds

For high-traffic users, cache the rendered feed temporarily:

```bash
SET rendered_feed:user:42 "[...json...]" EX 60
```

This absorbs burst traffic while sacrificing 60 seconds of freshness.

## Summary

A Redis-backed news feed uses lists of post IDs per user for O(1) feed reads, hybrid fan-out to balance write cost for celebrities, and pipelining to batch-fetch post details. In an interview, discuss the fan-out trade-offs and how TTL-based caching can reduce DB load at the cost of slight staleness.
