# How to Implement Redis Pub/Sub Patterns for Real-Time Event Broadcasting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Redis, Pub/Sub, Real-Time

Description: Learn how to implement Redis Pub/Sub for real-time event broadcasting, build notification systems, and create scalable message distribution architectures in Kubernetes environments.

---

Redis Pub/Sub provides a lightweight messaging pattern for broadcasting events to multiple subscribers in real-time. Unlike message queues that persist messages, Pub/Sub delivers messages only to active subscribers, making it ideal for notifications, live updates, and event broadcasting where persistence is not required.

In this guide, you'll learn how to implement Redis Pub/Sub patterns, build scalable subscriber systems, use pattern subscriptions, and integrate Pub/Sub with Kubernetes deployments for real-time event distribution.

## Understanding Redis Pub/Sub

Redis Pub/Sub provides:

- **Fire-and-forget delivery** - No message persistence
- **Multiple subscribers** - All active subscribers receive messages
- **Pattern matching** - Subscribe to channel patterns using wildcards
- **Low latency** - Minimal overhead for message delivery
- **Decoupling** - Publishers don't know about subscribers

Best for:
- Real-time notifications
- Live dashboards
- Chat systems
- Event broadcasting
- Cache invalidation signals

Not suitable for:
- Guaranteed message delivery
- Message persistence
- Message replay
- Work queues requiring acknowledgments

## Publishing Messages

Basic publishing:

```python
import redis

r = redis.Redis(host='redis.default.svc.cluster.local', port=6379)

# Publish message to channel
r.publish('notifications', 'User logged in')

# Publish JSON data
import json
data = {'user_id': 123, 'event': 'login', 'timestamp': 1234567890}
r.publish('events:user', json.dumps(data))

# Returns number of subscribers that received the message
subscribers = r.publish('alerts', 'System maintenance')
print(f"Message delivered to {subscribers} subscribers")
```

Go implementation:

```go
package main

import (
    "context"
    "encoding/json"
    "github.com/go-redis/redis/v8"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{
        Addr: "redis.default.svc.cluster.local:6379",
    })

    // Publish message
    err := rdb.Publish(ctx, "notifications", "New order received").Err()
    if err != nil {
        panic(err)
    }

    // Publish structured data
    event := map[string]interface{}{
        "type": "order_created",
        "order_id": 123,
        "amount": 99.99,
    }
    data, _ := json.Marshal(event)
    rdb.Publish(ctx, "events:orders", string(data))
}
```

## Subscribing to Channels

Simple subscription:

```python
import redis

r = redis.Redis(host='redis.default.svc.cluster.local', port=6379, decode_responses=True)

# Subscribe to channel
pubsub = r.pubsub()
pubsub.subscribe('notifications')

print("Listening for messages...")
for message in pubsub.listen():
    if message['type'] == 'message':
        print(f"Received: {message['data']}")
```

Multiple channel subscription:

```python
pubsub = r.pubsub()
pubsub.subscribe('notifications', 'alerts', 'events:user')

for message in pubsub.listen():
    if message['type'] == 'message':
        channel = message['channel']
        data = message['data']
        print(f"Channel {channel}: {data}")
```

Go subscriber:

```go
func subscribeToChannels(ctx context.Context, rdb *redis.Client) {
    pubsub := rdb.Subscribe(ctx, "notifications", "alerts")
    defer pubsub.Close()

    // Wait for confirmation
    _, err := pubsub.Receive(ctx)
    if err != nil {
        panic(err)
    }

    // Listen for messages
    ch := pubsub.Channel()
    for msg := range ch {
        log.Printf("Channel: %s, Message: %s", msg.Channel, msg.Payload)
    }
}
```

## Using Pattern Subscriptions

Subscribe to multiple channels with patterns:

```python
pubsub = r.pubsub()

# Subscribe to all event channels
pubsub.psubscribe('events:*')

# Subscribe to user-specific channels
pubsub.psubscribe('user:*:notifications')

for message in pubsub.listen():
    if message['type'] == 'pmessage':
        pattern = message['pattern']
        channel = message['channel']
        data = message['data']
        print(f"Pattern {pattern} matched {channel}: {data}")
```

Go pattern subscription:

```go
func patternSubscribe(ctx context.Context, rdb *redis.Client) {
    pubsub := rdb.PSubscribe(ctx, "events:*", "user:*:notifications")
    defer pubsub.Close()

    ch := pubsub.Channel()
    for msg := range ch {
        log.Printf("Pattern: %s, Channel: %s, Message: %s",
            msg.Pattern, msg.Channel, msg.Payload)
    }
}
```

## Building a Notification Service

Deploy subscriber pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notification-service
  template:
    metadata:
      labels:
        app: notification-service
    spec:
      containers:
      - name: subscriber
        image: notification-service:latest
        env:
        - name: REDIS_HOST
          value: redis.default.svc.cluster.local
        - name: REDIS_PORT
          value: "6379"
```

Service implementation:

```python
import redis
import json
import requests
import os

class NotificationService:
    def __init__(self):
        self.redis = redis.Redis(
            host=os.getenv('REDIS_HOST'),
            port=int(os.getenv('REDIS_PORT')),
            decode_responses=True
        )
        self.pubsub = self.redis.pubsub()

    def start(self):
        # Subscribe to notification channels
        self.pubsub.psubscribe('notifications:*')

        print("Notification service started")

        for message in self.pubsub.listen():
            if message['type'] == 'pmessage':
                self.handle_notification(message)

    def handle_notification(self, message):
        channel = message['channel']
        data = json.loads(message['data'])

        notification_type = channel.split(':')[1]

        if notification_type == 'email':
            self.send_email(data)
        elif notification_type == 'sms':
            self.send_sms(data)
        elif notification_type == 'push':
            self.send_push_notification(data)

    def send_email(self, data):
        print(f"Sending email to {data['to']}: {data['subject']}")
        # Send via email service

    def send_sms(self, data):
        print(f"Sending SMS to {data['phone']}: {data['message']}")
        # Send via SMS gateway

    def send_push_notification(self, data):
        print(f"Sending push to device {data['device_id']}")
        # Send via push service

if __name__ == '__main__':
    service = NotificationService()
    service.start()
```

## Implementing Chat System

Real-time chat with Redis Pub/Sub:

```go
package main

import (
    "context"
    "encoding/json"
    "net/http"
    "github.com/go-redis/redis/v8"
    "github.com/gorilla/websocket"
)

type ChatMessage struct {
    RoomID    string `json:"room_id"`
    UserID    string `json:"user_id"`
    Message   string `json:"message"`
    Timestamp int64  `json:"timestamp"`
}

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool { return true },
}

var rdb = redis.NewClient(&redis.Options{
    Addr: "redis:6379",
})

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
    conn, _ := upgrader.Upgrade(w, r, nil)
    defer conn.Close()

    roomID := r.URL.Query().Get("room")
    ctx := context.Background()

    // Subscribe to room channel
    pubsub := rdb.Subscribe(ctx, "chat:"+roomID)
    defer pubsub.Close()

    ch := pubsub.Channel()

    // Send messages from channel to WebSocket
    go func() {
        for msg := range ch {
            conn.WriteMessage(websocket.TextMessage, []byte(msg.Payload))
        }
    }()

    // Receive messages from WebSocket and publish
    for {
        _, message, err := conn.ReadMessage()
        if err != nil {
            break
        }

        var chatMsg ChatMessage
        json.Unmarshal(message, &chatMsg)
        chatMsg.RoomID = roomID

        data, _ := json.Marshal(chatMsg)
        rdb.Publish(ctx, "chat:"+roomID, string(data))
    }
}

func main() {
    http.HandleFunc("/ws", handleWebSocket)
    http.ListenAndServe(":8080", nil)
}
```

## Implementing Cache Invalidation

Broadcast cache invalidation events:

```python
# Publisher (when data changes)
def invalidate_cache(key):
    r = redis.Redis(host='redis', port=6379)
    r.publish('cache:invalidate', json.dumps({'key': key}))

# Subscriber (application instances)
def cache_invalidation_listener():
    r = redis.Redis(host='redis', port=6379, decode_responses=True)
    pubsub = r.pubsub()
    pubsub.subscribe('cache:invalidate')

    for message in pubsub.listen():
        if message['type'] == 'message':
            data = json.loads(message['data'])
            cache_key = data['key']

            # Remove from local cache
            local_cache.delete(cache_key)
            print(f"Invalidated cache key: {cache_key}")
```

## Building Live Dashboard

Broadcast metrics updates:

```python
# Metrics publisher
import time

def publish_metrics():
    r = redis.Redis(host='redis', port=6379)

    while True:
        metrics = {
            'cpu': get_cpu_usage(),
            'memory': get_memory_usage(),
            'requests': get_request_count(),
            'timestamp': time.time()
        }

        r.publish('metrics:system', json.dumps(metrics))
        time.sleep(5)

# Dashboard subscriber
def dashboard_subscriber():
    r = redis.Redis(host='redis', port=6379, decode_responses=True)
    pubsub = r.pubsub()
    pubsub.subscribe('metrics:system')

    for message in pubsub.listen():
        if message['type'] == 'message':
            metrics = json.loads(message['data'])
            update_dashboard(metrics)
```

## Monitoring Pub/Sub

Check active subscriptions:

```bash
# Get number of subscriptions
redis-cli PUBSUB NUMSUB notifications alerts

# Get channels with subscribers
redis-cli PUBSUB CHANNELS

# Get pattern subscriptions
redis-cli PUBSUB NUMPAT
```

Create monitoring metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: redis-pubsub-alerts
spec:
  groups:
  - name: redis-pubsub
    rules:
    - alert: NoActiveSubscribers
      expr: |
        redis_pubsub_channels_subscribers == 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "No active subscribers for channel"
```

## Best Practices

Follow these practices:

1. **Don't rely on Pub/Sub for critical messages** - No persistence or delivery guarantees
2. **Handle reconnections** - Subscribers miss messages while disconnected
3. **Use patterns sparingly** - Pattern matching has overhead
4. **Monitor subscriber count** - Ensure subscribers are active
5. **Keep messages small** - Pub/Sub is designed for lightweight messages
6. **Consider Redis Streams** - For persistent message queues
7. **Implement idempotency** - Messages might be processed multiple times

## Conclusion

Redis Pub/Sub provides a simple, efficient pattern for real-time event broadcasting in Kubernetes environments. By understanding its fire-and-forget nature and implementing appropriate subscriber patterns, you can build responsive notification systems, live dashboards, and real-time applications.

While Pub/Sub lacks persistence and delivery guarantees, its simplicity and low latency make it perfect for scenarios where real-time delivery to active subscribers is more important than guaranteed delivery. For critical messages requiring persistence, consider Redis Streams instead.
