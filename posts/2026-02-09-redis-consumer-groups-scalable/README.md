# How to Configure Redis Consumer Groups for Scalable Message Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Redis, Streams, Scalability

Description: Learn how to implement Redis consumer groups for scalable message processing with load balancing, automatic message distribution, and fault-tolerant consumption patterns.

---

Redis Streams consumer groups enable multiple consumers to cooperatively process messages from a stream. Unlike simple Pub/Sub, consumer groups provide message persistence, automatic load balancing, and the ability to track which messages have been processed. This makes them suitable for building scalable, reliable message processing systems.

In this guide, you'll learn how to create and manage consumer groups, implement scalable consumers, handle pending messages, and build fault-tolerant processing pipelines using Redis Streams on Kubernetes.

## Understanding Redis Consumer Groups

Consumer groups provide:

- **Load balancing** - Messages automatically distributed among consumers
- **Message persistence** - Messages remain until acknowledged
- **Delivery guarantees** - Track pending and acknowledged messages
- **Multiple groups** - Different consumer groups can process the same stream
- **Consumer tracking** - Monitor individual consumer progress

Ideal for:
- Job queues with multiple workers
- Event processing pipelines
- Task distribution systems
- Audit log processing

## Creating Consumer Groups

Create a stream and consumer group:

```bash
# Create stream
redis-cli XADD orders * order_id 123 amount 99.99

# Create consumer group starting from beginning
redis-cli XGROUP CREATE orders processing_group 0 MKSTREAM

# Create consumer group starting from latest
redis-cli XGROUP CREATE orders analytics_group $ MKSTREAM
```

Using Python:

```python
import redis

r = redis.Redis(host='redis.default.svc.cluster.local', port=6379, decode_responses=True)

# Create stream with initial message
r.xadd('orders', {'order_id': '123', 'amount': '99.99'})

# Create consumer group
try:
    r.xgroup_create('orders', 'processing_group', id='0', mkstream=True)
except redis.ResponseError as e:
    if 'BUSYGROUP' not in str(e):
        raise
```

Using Go:

```go
package main

import (
    "context"
    "github.com/go-redis/redis/v8"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{
        Addr: "redis.default.svc.cluster.local:6379",
    })

    // Create consumer group
    err := rdb.XGroupCreateMkStream(ctx, "orders", "processing_group", "0").Err()
    if err != nil {
        // Group might already exist
        println(err.Error())
    }
}
```

## Implementing Scalable Consumers

Deploy multiple consumer instances:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
  namespace: default
spec:
  replicas: 5  # Scale to 5 consumers
  selector:
    matchLabels:
      app: order-processor
  template:
    metadata:
      labels:
        app: order-processor
    spec:
      containers:
      - name: processor
        image: order-processor:latest
        env:
        - name: REDIS_HOST
          value: redis.default.svc.cluster.local
        - name: REDIS_PORT
          value: "6379"
        - name: STREAM_KEY
          value: orders
        - name: GROUP_NAME
          value: processing_group
        - name: CONSUMER_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
```

Consumer implementation:

```python
import redis
import os
import time
import signal
import sys

class OrderProcessor:
    def __init__(self):
        self.redis = redis.Redis(
            host=os.getenv('REDIS_HOST'),
            port=int(os.getenv('REDIS_PORT')),
            decode_responses=True
        )
        self.stream_key = os.getenv('STREAM_KEY')
        self.group_name = os.getenv('GROUP_NAME')
        self.consumer_name = os.getenv('CONSUMER_NAME', 'default')
        self.running = True

        signal.signal(signal.SIGTERM, self.shutdown)
        signal.signal(signal.SIGINT, self.shutdown)

    def shutdown(self, signum, frame):
        print(f"Shutting down consumer {self.consumer_name}")
        self.running = False

    def process_message(self, message_id, data):
        """Process individual message"""
        try:
            order_id = data.get('order_id')
            amount = data.get('amount')

            print(f"Processing order {order_id} for ${amount}")

            # Simulate processing
            time.sleep(0.1)

            # Acknowledge message after successful processing
            self.redis.xack(self.stream_key, self.group_name, message_id)
            print(f"Acknowledged message {message_id}")

            return True
        except Exception as e:
            print(f"Error processing message {message_id}: {e}")
            return False

    def run(self):
        """Main consumer loop"""
        print(f"Starting consumer {self.consumer_name}")

        while self.running:
            try:
                # Read messages from group
                messages = self.redis.xreadgroup(
                    groupname=self.group_name,
                    consumername=self.consumer_name,
                    streams={self.stream_key: '>'},
                    count=10,
                    block=1000  # Block for 1 second
                )

                for stream_name, stream_messages in messages:
                    for message_id, data in stream_messages:
                        self.process_message(message_id, data)

            except redis.RedisError as e:
                print(f"Redis error: {e}")
                time.sleep(1)

        print(f"Consumer {self.consumer_name} stopped")

if __name__ == '__main__':
    processor = OrderProcessor()
    processor.run()
```

Go implementation:

```go
package main

import (
    "context"
    "log"
    "os"
    "time"
    "github.com/go-redis/redis/v8"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{
        Addr: os.Getenv("REDIS_HOST") + ":" + os.Getenv("REDIS_PORT"),
    })

    streamKey := os.Getenv("STREAM_KEY")
    groupName := os.Getenv("GROUP_NAME")
    consumerName := os.Getenv("CONSUMER_NAME")

    for {
        // Read messages from consumer group
        messages, err := rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
            Group:    groupName,
            Consumer: consumerName,
            Streams:  []string{streamKey, ">"},
            Count:    10,
            Block:    time.Second,
        }).Result()

        if err != nil && err != redis.Nil {
            log.Printf("Error reading: %v", err)
            time.Sleep(time.Second)
            continue
        }

        for _, message := range messages {
            for _, msg := range message.Messages {
                // Process message
                processOrder(msg.Values)

                // Acknowledge
                rdb.XAck(ctx, streamKey, groupName, msg.ID)
            }
        }
    }
}

func processOrder(data map[string]interface{}) {
    log.Printf("Processing order: %v", data)
    time.Sleep(100 * time.Millisecond)
}
```

## Handling Pending Messages

Claim and process pending messages from failed consumers:

```python
def process_pending_messages(self):
    """Process messages that weren't acknowledged"""
    # Get pending messages
    pending = self.redis.xpending_range(
        name=self.stream_key,
        groupname=self.group_name,
        min='-',
        max='+',
        count=100
    )

    for p in pending:
        message_id = p['message_id']
        consumer = p['consumer']
        idle_time = p['time_since_delivered']

        # Claim messages idle for more than 60 seconds
        if idle_time > 60000:  # milliseconds
            claimed = self.redis.xclaim(
                name=self.stream_key,
                groupname=self.group_name,
                consumername=self.consumer_name,
                min_idle_time=60000,
                message_ids=[message_id]
            )

            for msg_id, data in claimed:
                self.process_message(msg_id, data)
```

Automatic recovery in Go:

```go
func processPendingMessages(ctx context.Context, rdb *redis.Client) {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    for range ticker.C {
        // Get pending messages
        pending, err := rdb.XPendingExt(ctx, &redis.XPendingExtArgs{
            Stream: streamKey,
            Group:  groupName,
            Start:  "-",
            End:    "+",
            Count:  100,
        }).Result()

        if err != nil {
            continue
        }

        for _, p := range pending {
            // Claim messages idle for more than 1 minute
            if p.Idle > time.Minute {
                claimed, _ := rdb.XClaim(ctx, &redis.XClaimArgs{
                    Stream:   streamKey,
                    Group:    groupName,
                    Consumer: consumerName,
                    MinIdle:  time.Minute,
                    Messages: []string{p.ID},
                }).Result()

                for _, msg := range claimed {
                    processOrder(msg.Values)
                    rdb.XAck(ctx, streamKey, groupName, msg.ID)
                }
            }
        }
    }
}
```

## Implementing Autoscaling

Use HPA with Redis metrics:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-exporter
  namespace: default
spec:
  selector:
    app: redis-exporter
  ports:
  - port: 9121
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-exporter
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-exporter
  template:
    metadata:
      labels:
        app: redis-exporter
    spec:
      containers:
      - name: exporter
        image: oliver006/redis_exporter:latest
        env:
        - name: REDIS_ADDR
          value: redis.default.svc.cluster.local:6379
        ports:
        - containerPort: 9121
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-processor-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-processor
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Pods
    pods:
      metric:
        name: redis_stream_pending_messages
      target:
        type: AverageValue
        averageValue: "100"
```

## Monitoring Consumer Groups

Check consumer group status:

```bash
# Get consumer group info
redis-cli XINFO GROUPS orders

# Get consumers in group
redis-cli XINFO CONSUMERS orders processing_group

# Get pending messages
redis-cli XPENDING orders processing_group
```

Create Prometheus alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: redis-consumer-alerts
spec:
  groups:
  - name: redis-consumers
    rules:
    - alert: RedisConsumerGroupLagging
      expr: |
        redis_stream_length - redis_consumer_group_last_delivered_id > 1000
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Consumer group lagging"

    - alert: RedisConsumerGroupPendingHigh
      expr: |
        redis_consumer_group_pending > 500
      for: 5m
      labels:
        severity: warning
```

## Best Practices

Follow these practices:

1. **Use unique consumer names** - Typically pod name in Kubernetes
2. **Handle pending messages** - Implement recovery for failed consumers
3. **Set appropriate block times** - Balance responsiveness and resource usage
4. **Monitor consumer lag** - Alert on growing backlogs
5. **Implement graceful shutdown** - Process pending before terminating
6. **Use batch reads** - Read multiple messages per call for efficiency
7. **Test failure scenarios** - Verify message recovery works

## Conclusion

Redis Streams consumer groups provide scalable, fault-tolerant message processing with minimal complexity. By implementing proper consumer patterns, handling pending messages, and monitoring group health, you build robust distributed processing systems on Kubernetes.

The combination of automatic load balancing, message persistence, and simple APIs makes Redis consumer groups an excellent choice for job queues, event processing, and task distribution in cloud-native applications.
