# How to Use Pattern Subscriptions in Redis Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Pattern Subscription, PSUBSCRIBE, Messaging

Description: Use PSUBSCRIBE and PUNSUBSCRIBE to subscribe to multiple Redis Pub/Sub channels with glob-style pattern matching instead of exact channel names.

---

## What are Pattern Subscriptions

Regular `SUBSCRIBE` matches exact channel names. `PSUBSCRIBE` accepts glob-style patterns that match multiple channel names simultaneously:

- `*` matches any sequence of characters
- `?` matches a single character
- `[abc]` matches one character from the set

This allows a single subscriber to receive messages from a family of channels without knowing all channel names in advance.

## Pattern Examples

| Pattern | Matches | Does not match |
|---|---|---|
| `events.*` | `events.user`, `events.order` | `events`, `other.events` |
| `user:?:updated` | `user:1:updated`, `user:a:updated` | `user:123:updated` |
| `order:[0-9]:*` | `order:1:created` | `order:10:created` |
| `*.error` | `api.error`, `db.error` | `error`, `api.errors` |

## Step 1 - Subscribe to a Pattern with redis-cli

```bash
redis-cli PSUBSCRIBE 'events.*'
```

Output:

```text
Reading messages... (press Ctrl-C to quit)
1) "psubscribe"
2) "events.*"
3) (integer) 1
```

When a matching message arrives:

```text
1) "pmessage"
2) "events.*"        # The pattern that matched
3) "events.user"     # The actual channel
4) "user signed up"  # The message payload
```

## Step 2 - PSUBSCRIBE in Python

```python
import redis

r = redis.Redis(host='localhost', port=6379)
pubsub = r.pubsub()

def handle_event(message):
    if message['type'] == 'pmessage':
        pattern = message['pattern']
        channel = message['channel']
        data = message['data']
        print(f"Pattern: {pattern}, Channel: {channel}, Data: {data}")

# Subscribe to multiple patterns
pubsub.psubscribe(**{
    'events.*': handle_event,
    'user:*:updated': handle_event,
})

# Run in background thread
thread = pubsub.run_in_thread(sleep_time=0.001)

# Later, stop it
# thread.stop()
```

## Step 3 - Subscribe to Multiple Patterns

A client can subscribe to multiple patterns simultaneously:

```bash
redis-cli PSUBSCRIBE 'orders.*' 'payments.*' 'notifications.*'
```

In Python:

```python
pubsub.psubscribe('orders.*', 'payments.*', 'notifications.*')
```

Each pattern subscription is independent. If a channel name matches multiple patterns, the subscriber receives one message per matching pattern.

## Step 4 - Testing with PUBLISH

```bash
# In one terminal - subscriber
redis-cli PSUBSCRIBE 'events.*'

# In another terminal - publisher
redis-cli PUBLISH events.user "user logged in"
redis-cli PUBLISH events.order "order created"
redis-cli PUBLISH other.channel "this does not match"
```

## Step 5 - Check Active Pattern Subscriptions

```bash
redis-cli PUBSUB NUMPAT
```

Returns the total number of active pattern subscriptions across all clients.

```bash
# Get all pattern subscribers
redis-cli CLIENT LIST | grep "psub=1"
```

## Step 6 - PUNSUBSCRIBE

Unsubscribe from a specific pattern or all patterns:

```bash
# Unsubscribe from specific pattern
redis-cli PUNSUBSCRIBE 'events.*'

# Unsubscribe from all patterns
redis-cli PUNSUBSCRIBE
```

In Python:

```python
pubsub.punsubscribe('events.*')
# or all at once
pubsub.punsubscribe()
```

## Step 7 - Performance Considerations

Pattern matching has a cost: for each published message, Redis checks it against all registered patterns. The complexity is O(N+M) where N is the number of subscribed clients and M is the number of pattern subscriptions.

```bash
redis-cli PUBSUB NUMPAT
```

If you have thousands of pattern subscriptions with complex patterns, consider using exact channel names with a routing key prefix instead, or use Redis Streams with consumer groups which avoid this overhead entirely.

## Step 8 - Combining SUBSCRIBE and PSUBSCRIBE

A single client can use both exact and pattern subscriptions:

```python
pubsub = r.pubsub()

# Exact subscription for high-frequency critical channel
pubsub.subscribe('heartbeat')

# Pattern subscription for dynamic channels
pubsub.psubscribe('alerts.*')

for message in pubsub.listen():
    if message['type'] in ('message', 'pmessage'):
        print(message)
```

## Summary

`PSUBSCRIBE` enables subscribing to families of Redis Pub/Sub channels using glob patterns without knowing exact channel names. It is ideal for event routing by category or namespace. Be mindful of the O(M) pattern matching overhead at publish time and avoid accumulating thousands of active patterns. For high-throughput scenarios where pattern matching overhead is a concern, consider exact channel names or Redis Streams.
