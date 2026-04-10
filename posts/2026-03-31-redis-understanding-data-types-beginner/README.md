# Understanding Redis Data Types (Beginner Guide)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Data Type, Beginner, Structure, Overview

Description: A beginner guide to Redis data types - explaining String, Hash, List, Set, Sorted Set, and Stream with practical use cases for each.

---

Redis is often described as a key-value store, but that undersells it. Each key in Redis can hold a different data structure, and choosing the right one is the key to getting the best performance. This guide explains each data type and when to use it.

## String

The most basic type. Strings can hold text, numbers, or binary data up to 512 MB.

```bash
SET username "alice"
SET page_views 150
INCR page_views     # atomic increment -> 151
SET config '{"theme":"dark","lang":"en"}'  # JSON blob
```

**Use when:** caching HTML snippets, storing JSON, counters, session tokens, distributed locks.

## Hash

A hash is like a mini-dictionary inside a key. It stores field-value pairs, perfect for representing objects.

```bash
HSET user:42 name "Alice" email "alice@example.com" age 30
HGET user:42 name          # "Alice"
HGETALL user:42            # all fields
HINCRBY user:42 age 1      # increment a field
```

**Use when:** storing user profiles, product data, configuration objects - anything with multiple attributes.

## List

An ordered sequence of strings. New elements can be pushed to the front (head) or back (tail), making it efficient as both a stack and a queue.

```bash
RPUSH jobs "send_email" "resize_image" "send_sms"
LPOP jobs            # "send_email" (from front)
RPOP jobs            # "send_sms" (from back)
BLPOP jobs 0         # block waiting for next job
LRANGE jobs 0 -1     # view all items
```

**Use when:** job queues, activity feeds, chat history, undo stacks.

## Set

An unordered collection of unique strings. Adding the same value twice has no effect.

```bash
SADD tags "redis" "nosql" "cache"
SADD tags "redis"           # no-op, already present
SISMEMBER tags "nosql"      # 1 (exists)
SMEMBERS tags               # all members
SCARD tags                  # count: 3

# Set operations
SUNION set1 set2            # all members from both
SINTER set1 set2            # members in both
SDIFF set1 set2             # in set1 but not set2
```

**Use when:** tracking unique visitors, tags, online users, mutual friends, permission sets.

## Sorted Set

Like a Set, but each member has a score. Members are sorted by score and can be queried by rank or score range.

```bash
ZADD scores 9500 "alice"
ZADD scores 8200 "bob"
ZADD scores 11000 "carol"

ZREVRANGE scores 0 -1 WITHSCORES   # all, highest first
ZREVRANK scores "alice"             # rank (0 = top)
ZSCORE scores "alice"               # get score
ZINCRBY scores 500 "alice"          # add to score
```

**Use when:** leaderboards, priority queues, time-series data, rate limiter windows, autocomplete.

## Stream

An append-only log, similar to Apache Kafka. Supports consumer groups for parallel processing with acknowledgment.

```bash
XADD events * user_id 42 action "login"
XREAD COUNT 10 STREAMS events 0-0

# Consumer groups
XGROUP CREATE events workers $ MKSTREAM
XREADGROUP GROUP workers consumer1 COUNT 5 STREAMS events >
XACK events workers <message-id>
```

**Use when:** event sourcing, audit logs, real-time analytics pipelines, reliable task queues.

## Other Types

**HyperLogLog** - probabilistic unique count (uses constant memory):

```bash
PFADD unique_visitors "user:1" "user:2" "user:3"
PFCOUNT unique_visitors  # approximate unique count
```

**Bitmap** - bit-level operations on strings:

```bash
SETBIT user:42:logins 0 1   # day 0: logged in
BITCOUNT user:42:logins     # count login days
```

**Geospatial** - store and query geographic coordinates:

```bash
GEOADD locations 13.361389 38.115556 "Palermo"
GEOADD locations 15.087269 37.502669 "Catania"
GEODIST locations "Palermo" "Catania" km
```

## Choosing the Right Data Type

| Need | Use |
|------|-----|
| Single value / counter | String |
| Object with fields | Hash |
| Queue or stack | List |
| Unique membership | Set |
| Ranking / scoring | Sorted Set |
| Event log / message stream | Stream |
| Approximate unique count | HyperLogLog |

## Summary

Redis data types go beyond simple key-value storage. Hashes store objects, Lists power queues, Sets track unique members, Sorted Sets enable leaderboards, and Streams provide reliable messaging. Choosing the right type for each use case is what makes Redis so efficient - using a Sorted Set for a leaderboard is far simpler and faster than building it in a relational database.
