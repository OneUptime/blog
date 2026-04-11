# How to Use SUBSCRIBE and UNSUBSCRIBE in Redis Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Messaging, Real-Time

Description: Learn how to use SUBSCRIBE and UNSUBSCRIBE commands in Redis Pub/Sub to listen for messages on named channels and stop listening when done.

---

## Overview of Redis Pub/Sub

Redis Pub/Sub is a messaging pattern where publishers send messages to named channels and subscribers receive them. `SUBSCRIBE` puts a client into subscriber mode for one or more channels. `UNSUBSCRIBE` removes the client from one or more channels.

## The SUBSCRIBE Command

```text
SUBSCRIBE channel [channel ...]
```

You can subscribe to one or multiple channels in a single command:

```bash
SUBSCRIBE notifications
SUBSCRIBE orders payments inventory
```

Once subscribed, the client enters a special subscriber mode where only `SUBSCRIBE`, `UNSUBSCRIBE`, `PSUBSCRIBE`, `PUNSUBSCRIBE`, `PING`, and `RESET` are accepted.

Each subscription confirmation returns three values:

```text
1) "subscribe"
2) "notifications"
3) (integer) 1   <- total number of active subscriptions
```

## The UNSUBSCRIBE Command

```text
UNSUBSCRIBE [channel [channel ...]]
```

With no arguments, `UNSUBSCRIBE` removes the client from all channels it is subscribed to:

```bash
UNSUBSCRIBE notifications
UNSUBSCRIBE orders payments
UNSUBSCRIBE   # leaves all channels
```

When the subscription count drops to zero, the client exits subscriber mode automatically.

## Receiving Messages

Messages arrive as three-element arrays:

```text
1) "message"
2) "notifications"        <- channel name
3) "User signed up!"      <- message payload
```

## Publishing to a Channel

From another client, publish messages with `PUBLISH`:

```bash
PUBLISH notifications "System maintenance at 2AM"
PUBLISH orders "New order #12345"
```

## Practical Example in Python

```python
import redis
import threading

def subscriber():
    sub_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    pubsub = sub_client.pubsub()
    pubsub.subscribe('notifications', 'alerts')

    for message in pubsub.listen():
        if message['type'] == 'message':
            print(f"Channel: {message['channel']}")
            print(f"Data: {message['data']}")
            if message['data'] == 'stop':
                pubsub.unsubscribe('notifications', 'alerts')
                break

def publisher():
    pub_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    pub_client.publish('notifications', 'Hello from publisher!')
    pub_client.publish('alerts', 'Critical: disk usage at 90%')
    pub_client.publish('notifications', 'stop')

t = threading.Thread(target=subscriber, daemon=True)
t.start()
publisher()
t.join(timeout=5)
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

(async () => {
  const subscriber = createClient();
  const publisher = createClient();

  await subscriber.connect();
  await publisher.connect();

  // Subscribe to channels
  await subscriber.subscribe('notifications', (message, channel) => {
    console.log(`[${channel}] ${message}`);
  });

  await subscriber.subscribe('alerts', (message, channel) => {
    console.log(`ALERT on [${channel}]: ${message}`);
  });

  // Publish messages
  await publisher.publish('notifications', 'Deployment complete');
  await publisher.publish('alerts', 'Memory usage high');

  // Unsubscribe from one channel
  await subscriber.unsubscribe('alerts');

  // Unsubscribe from all
  await subscriber.unsubscribe();
})();
```

## Practical Example in Go

```go
package main

import (
    "context"
    "fmt"
    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

    sub := rdb.Subscribe(ctx, "notifications", "alerts")
    defer sub.Close()

    ch := sub.Channel()

    go func() {
        for msg := range ch {
            fmt.Printf("Channel: %s, Message: %s\n", msg.Channel, msg.Payload)
        }
    }()

    // Unsubscribe from one channel later
    sub.Unsubscribe(ctx, "alerts")
}
```

## Subscriber Mode Restrictions

While in subscriber mode, a client cannot run regular commands like `GET` or `SET`. Attempting to do so returns an error. Use a separate connection for pub/sub vs regular operations.

```text
# In subscriber mode:
GET some:key
# ERR Can't call 'GET' in Subscribe mode
```

## Multiple Channel Subscription Tracking

When subscribing to multiple channels, you receive a confirmation for each:

```bash
SUBSCRIBE ch1 ch2 ch3
# Response:
# 1) "subscribe" 2) "ch1" 3) (integer) 1
# 1) "subscribe" 2) "ch2" 3) (integer) 2
# 1) "subscribe" 2) "ch3" 3) (integer) 3
```

## Summary

`SUBSCRIBE` and `UNSUBSCRIBE` are the core commands of Redis Pub/Sub, enabling clients to listen to and leave named channels. Once subscribed, the client enters a dedicated mode receiving messages published with `PUBLISH`. For pattern-based subscriptions matching multiple channels, use `PSUBSCRIBE` and `PUNSUBSCRIBE` instead.
