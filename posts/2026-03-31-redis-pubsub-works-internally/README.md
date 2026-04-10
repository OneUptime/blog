# How Redis Pub/Sub Works Internally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Internal, Architecture, Channel

Description: Learn how Redis Pub/Sub works under the hood, covering channel subscription tracking, message dispatch, the RESP protocol flow, and memory behavior with slow consumers.

---

Redis Pub/Sub implements the publish-subscribe messaging pattern. Understanding its internal mechanics helps you predict its behavior, scale it correctly, and avoid common pitfalls.

## The Subscription Dictionary

Internally, Redis maintains a dictionary mapping each channel name to the list of clients subscribed to it. When a client subscribes, Redis adds that client's connection to the channel's subscriber list:

```bash
# Client subscribes to a channel
SUBSCRIBE orders:notifications

# Internally, Redis adds the client to:
# channels["orders:notifications"] = [client_1, client_3, client_7]
```

This lookup is O(1) per channel and O(N) for the subscribe operation itself where N is the number of channels being subscribed to at once.

## Message Publishing Flow

When you publish a message, Redis:
1. Looks up the channel in the subscription dictionary
2. Iterates over all subscribed clients
3. Writes the message directly to each client's output buffer
4. Returns the count of clients that received the message

```bash
# Publish returns the subscriber count
PUBLISH orders:notifications '{"order_id":1001,"status":"shipped"}'
# (integer) 3  <- 3 clients received this message
```

```python
import redis

r_publisher = redis.Redis(decode_responses=True)

count = r_publisher.publish('orders:notifications', 'order 1001 shipped')
print(f"Message delivered to {count} subscribers")
```

## Fire and Forget - No Persistence

Redis Pub/Sub has a critical characteristic: messages are not stored. If no subscriber is connected when you publish, the message is silently dropped:

```bash
# No subscribers on this channel
PUBLISH ghost:channel "important message"
# (integer) 0  <- nobody received it, message is gone
```

This distinguishes Pub/Sub from Streams. Streams persist messages; Pub/Sub does not.

## Subscriber State Machine

A client connection in subscribe mode enters a special state where it can only send:
- `SUBSCRIBE`, `UNSUBSCRIBE`, `PSUBSCRIBE`, `PUNSUBSCRIBE`, `SSUBSCRIBE`, `SUNSUBSCRIBE`
- `PING` (with an optional message)
- `RESET` (to exit subscribe mode)
- `QUIT`

```python
import redis

r = redis.Redis(decode_responses=True)

# redis-py creates a separate connection for pubsub
pubsub = r.pubsub()
pubsub.subscribe('orders:notifications')

# r.set() still works because redis-py gives the pubsub object its own connection.
# At the Redis protocol level, the subscribed connection itself is restricted
# to SUBSCRIBE, UNSUBSCRIBE, PSUBSCRIBE, PUNSUBSCRIBE, PING, RESET, and QUIT.
r.set('key', 'value')  # OK - r uses a different connection than pubsub
```

## Output Buffers and Slow Consumers

Redis writes published messages to each subscriber's output buffer. If a subscriber is slow and the buffer fills up, Redis drops the connection:

```bash
# Check the client-output-buffer-limit for pub/sub subscribers
CONFIG GET client-output-buffer-limit
```

Default limits for pub/sub:
```text
pubsub 32mb 8mb 60
# class  hard-limit  soft-limit  soft-seconds
# Disconnect if: buffer > 32mb instantly, or > 8mb for 60 seconds
```

## Pattern Subscriptions

Redis maintains a separate dictionary for pattern subscriptions (`PSUBSCRIBE`). When a message is published, Redis checks both exact channel matches and pattern matches:

```bash
# Subscribe to all order channels
PSUBSCRIBE orders:*

# This matches PSUBSCRIBE orders:*
PUBLISH orders:created '{"id":1001}'

# Redis checks:
# 1. Exact subscribers on "orders:created"
# 2. Pattern subscribers where "orders:*" matches "orders:created"
```

## PUBSUB Commands for Introspection

```bash
# List active channels (with at least one subscriber)
PUBSUB CHANNELS

# Count subscribers per channel
PUBSUB NUMSUB orders:notifications payments:events

# Count active pattern subscriptions
PUBSUB NUMPAT
```

## Summary

Redis Pub/Sub works by maintaining a channel-to-subscriber dictionary and directly writing messages to subscriber output buffers on publish. Messages are not persisted - if no subscriber is connected, the message is lost. Slow subscribers risk connection drops due to output buffer limits. For durable messaging with replay capability, use Redis Streams instead.
