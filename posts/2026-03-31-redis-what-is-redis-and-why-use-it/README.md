# What Is Redis and Why Should You Use It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Introduction, Cache, In-Memory, Beginner

Description: Learn what Redis is, how it works, why it is so fast, and the most common use cases - a beginner-friendly introduction to Redis.

---

Redis is one of the most popular databases in the world, yet many developers are not sure exactly what it is or why they should use it. This post answers both questions clearly.

## What Is Redis?

Redis stands for **Remote Dictionary Server**. It is an open source, in-memory data store that can be used as a database, cache, message broker, and streaming engine.

The key word is "in-memory." Unlike PostgreSQL or MySQL that store data on disk, Redis keeps all data in RAM. This is what makes it extremely fast - reads and writes typically take under 1 millisecond.

## Why Is Redis So Fast?

Three reasons:

1. **In-memory storage** - No disk I/O for reads or writes
2. **Single-threaded event loop** - No thread synchronization overhead
3. **Simple data structures** - Most per-key operations are O(1) or O(log N)

Redis can handle over 1 million operations per second on commodity hardware.

## What Data Types Does Redis Support?

Redis is not just a key-value store. It supports rich data structures:

```bash
# String - text, numbers, JSON
SET user:42:name "Alice"

# Hash - object with named fields
HSET user:42 name "Alice" email "alice@example.com"

# List - ordered sequence (great for queues)
RPUSH jobs "send_email"
BLPOP jobs 0

# Set - unordered unique values
SADD online_users "user:42"

# Sorted Set - ranked members (great for leaderboards)
ZADD scores 9500 "alice"
ZREVRANK scores "alice"

# Stream - append-only log (great for events)
XADD events * action "login" user_id 42
```

## Common Use Cases

**Caching** - Store database query results in Redis with a TTL. Subsequent requests read from Redis instead of hitting the database:

```bash
SET product:42 '{"name":"Widget","price":9.99}' EX 300
```

**Session Storage** - Store user sessions with automatic expiration:

```bash
SET session:abc123 '{"user_id":42}' EX 3600
```

**Rate Limiting** - Count API requests per user per minute:

```bash
INCR ratelimit:user:42
EXPIRE ratelimit:user:42 60
```

**Real-Time Leaderboards** - Rank players by score instantly:

```bash
ZADD game:scores 9500 "alice"
ZREVRANGE game:scores 0 9 WITHSCORES
```

**Pub/Sub Messaging** - Broadcast events to multiple services:

```bash
PUBLISH notifications "New order placed"
SUBSCRIBE notifications
```

## When NOT to Use Redis

Redis is not a replacement for a relational database. Avoid Redis as your primary data store when:
- Data must survive server crashes with zero loss (unless you configure AOF)
- You need complex joins or SQL queries
- Data is too large to fit in RAM
- You need ACID transactions across multiple resources

## Getting Started

Install Redis locally with one command:

```bash
# macOS
brew install redis && brew services start redis

# Ubuntu
sudo apt install redis-server

# Docker
docker run -d -p 6379:6379 redis:latest
```

Test it works:

```bash
redis-cli ping
# PONG
```

## Summary

Redis is an in-memory data store that excels at caching, session storage, rate limiting, leaderboards, and pub/sub messaging. Its speed comes from keeping data in RAM and using simple data structures. Use Redis alongside a durable database rather than as a replacement for it.
