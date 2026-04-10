# How to Use PUBSUB NUMSUB and PUBSUB NUMPAT in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, PubSub, Monitoring, Channel

Description: Learn how to use PUBSUB NUMSUB to count channel subscribers and PUBSUB NUMPAT to count active pattern subscriptions in Redis.

---

`PUBSUB NUMSUB` and `PUBSUB NUMPAT` are the subscriber count introspection commands for Redis Pub/Sub. Together with `PUBSUB CHANNELS`, they give you a complete picture of Pub/Sub activity on your Redis server.

## PUBSUB NUMSUB

`PUBSUB NUMSUB` returns the number of subscribers for the specified channels. It does not count pattern subscriptions (clients connected via `PSUBSCRIBE`).

### Syntax

```redis
PUBSUB NUMSUB [channel [channel ...]]
```

- With channel names - returns subscriber count per channel
- With no arguments - returns an empty array

### Examples

#### Count Subscribers for Specific Channels

```redis
PUBSUB NUMSUB orders:us orders:eu notifications
```

Output:

```text
1) "orders:us"
2) (integer) 5
3) "orders:eu"
4) (integer) 3
5) "notifications"
6) (integer) 12
```

The output alternates between channel name and subscriber count.

#### Check if Anyone is Listening

```redis
PUBSUB NUMSUB critical-alerts
```

Output:

```text
1) "critical-alerts"
2) (integer) 0
```

A count of `0` means no direct subscribers exist. Messages may still reach clients subscribed via `PSUBSCRIBE` with a matching pattern, since `NUMSUB` does not count pattern subscriptions.

#### Count for a Non-Existent Channel

`PUBSUB NUMSUB` returns `0` for any channel with no subscribers - whether it never existed or all subscribers disconnected.

## PUBSUB NUMPAT

`PUBSUB NUMPAT` returns the total number of active pattern subscriptions (from `PSUBSCRIBE`) across all clients on the server.

### Syntax

```redis
PUBSUB NUMPAT
```

### Examples

#### Count Total Pattern Subscriptions

```redis
PUBSUB NUMPAT
```

Output:

```text
(integer) 7
```

This means 7 pattern subscriptions (from `PSUBSCRIBE`) are active. Note this is the total count of patterns, not the number of clients - one client with `PSUBSCRIBE a:* b:* c:*` contributes 3 to this count.

#### Zero Pattern Subscriptions

```redis
PUBSUB NUMPAT
```

Output:

```text
(integer) 0
```

Indicates no `PSUBSCRIBE` subscriptions are active.

## Combining All Three Commands

A complete Pub/Sub health check:

```redis
# 1. Which channels are active?
PUBSUB CHANNELS *

# 2. How many subscribers per channel?
PUBSUB NUMSUB orders:us orders:eu notifications

# 3. How many pattern subscriptions exist?
PUBSUB NUMPAT
```

## PUBSUB SHARDNUMSUB (Redis 7.0+)

For Redis Cluster with sharded Pub/Sub:

```redis
PUBSUB SHARDNUMSUB orders:us
```

Returns the subscriber count for a sharded channel on the current shard.

## Use Cases

- **Pre-publish validation** - use `NUMSUB` to confirm at least one subscriber exists before publishing important messages
- **Subscriber count metrics** - export subscriber counts to a monitoring system
- **Load estimation** - high `NUMPAT` values indicate that every published message requires pattern matching against many subscriptions
- **Capacity planning** - track subscriber counts over time to plan for Pub/Sub scaling

## Summary

`PUBSUB NUMSUB` gives per-channel subscriber counts for direct subscriptions, while `PUBSUB NUMPAT` gives the total active pattern subscription count server-wide. Together with `PUBSUB CHANNELS`, these commands provide complete observability into your Redis Pub/Sub topology. A high `NUMPAT` value may indicate a performance concern, since every `PUBLISH` call must match against all active patterns.
