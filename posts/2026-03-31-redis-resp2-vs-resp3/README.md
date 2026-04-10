# How RESP2 vs RESP3 Differs in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RESP, Protocol, Performance

Description: Compare RESP2 and RESP3 protocol differences in Redis, including new data types, push messages, and when to upgrade your client.

---

Redis Serialization Protocol (RESP) is the wire protocol Redis uses for client-server communication. RESP2 has been the standard since Redis 1.2, while RESP3 was introduced in Redis 6.0 with significant improvements.

## RESP2 Overview

RESP2 uses 5 basic types to encode data:

```text
+ Simple strings   ("+OK\r\n")
- Errors           ("-ERR unknown command\r\n")
: Integers         (":1000\r\n")
$ Bulk strings     ("$6\r\nfoobar\r\n")
* Arrays           ("*2\r\n$3\r\nfoo\r\n$3\r\nbar\r\n")
```

Every response type is an array or scalar, forcing clients to maintain context to interpret responses correctly. For example, `HGETALL` returns a flat array where the client must pair alternating elements as key-value.

## RESP3 New Data Types

RESP3 adds 10 new types:

```text
% Maps           (native key-value, replaces paired arrays)
~ Sets           (native set type)
| Attributes     (metadata attached to responses)
> Push messages  (out-of-band server push)
( Big numbers
! Blob errors    (multi-line error messages)
= Verbatim string
, Double
# Boolean
_ Null
```

The map type directly addresses the `HGETALL` problem:

```python
# RESP2: client receives flat array, must pair manually
# ["field1", "val1", "field2", "val2"]
result = redis.hgetall("myhash")
# Result is already a dict because client does pairing

# RESP3: server sends a native map
# Client receives {"field1": "val1", "field2": "val2"} directly
```

## Push Messages in RESP3

RESP3's push message type (`>`) enables out-of-band notifications on the same connection. This is critical for Pub/Sub and keyspace notifications because clients no longer need a dedicated connection solely for subscriptions.

```python
import redis

r = redis.Redis(host="localhost", port=6379, protocol=3)

# Subscribe and receive pushes on the same connection
pubsub = r.pubsub()
pubsub.subscribe("my-channel")

for message in pubsub.listen():
    if message["type"] == "message":
        print(message["data"])
```

## Performance and Efficiency Differences

RESP3 reduces CPU overhead on the client side because:

1. Maps eliminate array pairing logic
2. Booleans avoid string comparison (`"1"` vs `True`)
3. Doubles avoid string-to-float parsing

Benchmark comparison (approximate, varies by workload):

```text
Operation        RESP2      RESP3     Improvement
HGETALL (100f)   1.8ms      1.2ms     ~33%
SMEMBERS (50)    0.9ms      0.7ms     ~22%
Client cache      N/A       built-in  significant
```

## Client-Side Caching

RESP3 enables client-side caching via tracking invalidation messages. The server notifies the client when a cached key changes:

```bash
# Enable tracking on the connection
CLIENT TRACKING ON BCAST

# Now the server pushes invalidation messages automatically
# when tracked keys change
```

## When to Use RESP2 vs RESP3

Use RESP2 when:
- Your client library does not support RESP3
- You are running Redis < 6.0
- You need compatibility with Redis forks that lack RESP3

Use RESP3 when:
- Your client supports it (redis-py 4.0+, ioredis 5.0+, Jedis 4.0+)
- You want client-side caching
- You want native type handling for maps and sets
- You use Pub/Sub heavily and want to avoid dual-connection patterns

## Summary

RESP3 is a superset of RESP2, adding native maps, sets, booleans, push messages, and client-side caching support. Most modern Redis clients have added RESP3 support, and upgrading is low-risk since the `HELLO` command gracefully negotiates the protocol version. If you are on Redis 6.0+ with a compatible client, RESP3 is worth enabling.
