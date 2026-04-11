# Top Redis Interview Questions for System Design

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Interview, System Design, Architecture, Scalability

Description: Redis system design interview questions covering distributed caching, pub/sub, rate limiting, leaderboards, and scaling strategies.

---

System design interviews often involve Redis as a core building block. Interviewers want to see that you can choose the right Redis data structure and deployment pattern to solve real-world problems at scale. Here are the most frequently asked questions.

## General Architecture Questions

**Q: When would you choose Redis over a traditional database for caching?**

Use Redis when you need sub-millisecond response times for frequently accessed data that is expensive to compute or query. Redis is ideal when the cache hit rate is high (above 80%), the data fits in memory, and some staleness is acceptable.

**Q: How do you handle cache invalidation?**

The three main strategies are:
- TTL-based expiration - simplest, data becomes stale naturally
- Event-driven invalidation - database writes trigger cache deletes
- Write-through - every DB write also updates the cache

```bash
# TTL-based
SET product:42 "{...}" EX 300

# Event-driven delete on update
DEL product:42
# then the next read repopulates it
```

## Rate Limiting

**Q: Design a rate limiter using Redis.**

A sliding window rate limiter using a sorted set:

```bash
# Key: ratelimit:{user_id}
# Add current timestamp as score and member
ZADD ratelimit:user1 1711900000.123 "1711900000.123"

# Remove entries older than the window (e.g., 60 seconds)
ZREMRANGEBYSCORE ratelimit:user1 0 1711899940.123

# Count requests in window
ZCARD ratelimit:user1

# Set key expiry to auto-clean
EXPIRE ratelimit:user1 60
```

## Pub/Sub and Messaging

**Q: When would you use Redis Pub/Sub vs Redis Streams?**

Use Pub/Sub for real-time fan-out where message loss is acceptable (notifications, live dashboards). Use Streams when you need message persistence, consumer groups, acknowledgments, and replay capability.

**Q: Design a real-time notification system using Redis.**

```text
Publisher (app server) --PUBLISH--> Redis channel
Subscribers (websocket servers) --SUBSCRIBE--> Redis channel
Each subscriber pushes to connected clients via WebSocket
```

For at-least-once delivery, use Streams with consumer groups instead.

## Leaderboards and Counters

**Q: How do you design a leaderboard using Redis?**

Sorted sets are perfect for leaderboards:

```bash
ZADD game:leaderboard 9500 "player1"
ZADD game:leaderboard 8200 "player2"
ZADD game:leaderboard 9800 "player3"

# Top 10 players
ZREVRANGE game:leaderboard 0 9 WITHSCORES

# Player rank (0-indexed from top)
ZREVRANK game:leaderboard "player1"
```

## Distributed Systems

**Q: How do you implement a distributed lock with Redis?**

Use the SET NX PX pattern (or Redlock for multi-node):

```bash
# Acquire lock: NX = only set if not exists, PX = expire in ms
SET lock:resource_id unique_token NX PX 30000

# Release lock: only release if token matches (atomic via Lua)
# EVAL script checks token and deletes
```

**Q: What are the consistency trade-offs with Redis caching?**

Redis cache introduces eventual consistency. Data can be stale between the last write to the source of truth (DB) and the TTL expiration. In write-heavy systems, you need explicit invalidation on writes. Replication adds another consistency dimension - reads from replicas may be slightly behind the primary.

## Summary

System design Redis interviews test your ability to select the right data structure (sorted sets for leaderboards and rate limiting, Streams for event queues) and understand the consistency trade-offs. Always discuss TTL strategies, cache invalidation, and horizontal scaling via Cluster when answering these questions.
