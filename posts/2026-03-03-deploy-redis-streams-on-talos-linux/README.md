# How to Deploy Redis Streams on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Redis Streams, Kubernetes, Event Streaming, Real-Time Data, DevOps

Description: Set up Redis Streams on Talos Linux for lightweight event streaming with consumer groups, persistent delivery, and real-time processing.

---

Redis Streams is a data structure built into Redis that acts as an append-only log, similar in concept to Apache Kafka but with the simplicity and speed of Redis. If your application needs event streaming without the operational overhead of a full Kafka cluster, Redis Streams is an excellent option. Running it on Talos Linux provides a secure, immutable foundation while keeping the deployment lightweight.

This guide covers deploying Redis with Streams enabled on Talos Linux, setting up consumer groups, and building real-time processing pipelines.

## What Are Redis Streams

Redis Streams were introduced in Redis 5.0 as a new data type. Each stream is an append-only log of entries, where each entry has a unique ID (typically a timestamp-based auto-generated ID) and consists of key-value pairs. Consumer groups allow multiple consumers to cooperatively process entries from a stream, with each entry delivered to exactly one consumer within the group.

The key differences from Kafka are that Redis Streams live in memory (with optional persistence), have simpler operational requirements, and work well for moderate throughput use cases. If you need millions of messages per second, Kafka is the better choice. For tens of thousands per second with minimal complexity, Redis Streams shines.

## Prerequisites

- Talos Linux cluster with at least one worker node
- `kubectl` and `talosctl` configured
- A StorageClass for persistent volumes

## Step 1: Deploy Redis with Persistence

Redis Streams require AOF persistence to survive restarts:

```yaml
# redis-streams-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: redis-streams
---
# redis-streams-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: redis-streams
data:
  redis.conf: |
    # Enable AOF persistence for stream durability
    appendonly yes
    appendfsync everysec
    aof-use-rdb-preamble yes

    # RDB snapshots as backup
    save 900 1
    save 300 10
    save 60 10000

    # Memory management
    maxmemory 2gb
    maxmemory-policy noeviction

    # Stream-specific settings
    stream-node-max-bytes 4096
    stream-node-max-entries 100

    # Network
    bind 0.0.0.0
    protected-mode no
    port 6379

    # Performance
    io-threads 4
    io-threads-do-reads yes
```

## Step 2: Deploy Redis StatefulSet

```yaml
# redis-streams-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: redis-streams
spec:
  serviceName: redis
  replicas: 1
  selector:
    matchLabels:
      app: redis-streams
  template:
    metadata:
      labels:
        app: redis-streams
    spec:
      containers:
        - name: redis
          image: redis:7.2-alpine
          ports:
            - containerPort: 6379
              name: redis
          command:
            - redis-server
            - /etc/redis/redis.conf
          volumeMounts:
            - name: redis-data
              mountPath: /data
            - name: redis-config
              mountPath: /etc/redis
          resources:
            requests:
              memory: "2Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
          livenessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 5
            periodSeconds: 5
      volumes:
        - name: redis-config
          configMap:
            name: redis-config
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 20Gi
---
# redis-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: redis-streams
spec:
  selector:
    app: redis-streams
  ports:
    - port: 6379
      targetPort: 6379
  type: ClusterIP
```

```bash
kubectl apply -f redis-streams-namespace.yaml
kubectl apply -f redis-streams-config.yaml
kubectl apply -f redis-streams-statefulset.yaml
```

## Step 3: Working with Redis Streams

Connect to Redis and start using streams:

```bash
# Connect to Redis
kubectl exec -it redis-0 -n redis-streams -- redis-cli
```

```bash
# Add entries to a stream
# XADD creates the stream if it does not exist
XADD orders * customer_id "cust-123" product "laptop" quantity "1" total "999.99"
XADD orders * customer_id "cust-456" product "keyboard" quantity "2" total "59.98"
XADD orders * customer_id "cust-789" product "monitor" quantity "1" total "399.99"

# Read entries from the stream
XRANGE orders - +

# Read the last 2 entries
XREVRANGE orders + - COUNT 2

# Get stream length
XLEN orders

# Get stream info
XINFO STREAM orders
```

## Step 4: Set Up Consumer Groups

Consumer groups are the key feature that makes Redis Streams useful for event processing:

```bash
# Create a consumer group starting from the beginning of the stream
XGROUP CREATE orders order-processors 0

# Create another group for analytics
XGROUP CREATE orders analytics-processors 0

# Read as consumer "worker-1" in the order-processors group
XREADGROUP GROUP order-processors worker-1 COUNT 1 BLOCK 5000 STREAMS orders >

# Read as consumer "worker-2" in the same group
XREADGROUP GROUP order-processors worker-2 COUNT 1 BLOCK 5000 STREAMS orders >

# Acknowledge processed messages
XACK orders order-processors <message-id>

# Check pending messages (unacknowledged)
XPENDING orders order-processors

# Check detailed pending info
XPENDING orders order-processors - + 10
```

## Step 5: Build a Stream Processor

Here is an example Python application that processes Redis Streams on Talos Linux:

```yaml
# stream-processor.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
  namespace: redis-streams
spec:
  replicas: 3
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
          image: python:3.12-slim
          command:
            - python
            - /app/processor.py
          env:
            - name: REDIS_HOST
              value: "redis.redis-streams.svc.cluster.local"
            - name: REDIS_PORT
              value: "6379"
            - name: CONSUMER_GROUP
              value: "order-processors"
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          volumeMounts:
            - name: app-code
              mountPath: /app
      volumes:
        - name: app-code
          configMap:
            name: processor-code
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: processor-code
  namespace: redis-streams
data:
  processor.py: |
    import os
    import redis
    import time
    import json

    # Connect to Redis
    r = redis.Redis(
        host=os.environ['REDIS_HOST'],
        port=int(os.environ['REDIS_PORT']),
        decode_responses=True
    )

    group = os.environ['CONSUMER_GROUP']
    consumer = os.environ['POD_NAME']
    stream = 'orders'

    # Create the consumer group if it does not exist
    try:
        r.xgroup_create(stream, group, id='0', mkstream=True)
    except redis.exceptions.ResponseError:
        pass  # Group already exists

    print(f"Consumer {consumer} started in group {group}")

    while True:
        try:
            # Read new messages with a 5-second block timeout
            messages = r.xreadgroup(
                group, consumer,
                {stream: '>'},
                count=10,
                block=5000
            )

            if messages:
                for stream_name, entries in messages:
                    for entry_id, data in entries:
                        print(f"Processing order {entry_id}: {data}")

                        # Process the order here
                        # ...

                        # Acknowledge the message
                        r.xack(stream, group, entry_id)
                        print(f"Acknowledged {entry_id}")

            # Also check for pending messages that need reprocessing
            pending = r.xpending_range(stream, group, '-', '+', 10)
            for msg in pending:
                idle_time = msg['time_since_delivered']
                if idle_time > 30000:  # 30 seconds
                    # Claim and reprocess stale messages
                    claimed = r.xclaim(
                        stream, group, consumer,
                        min_idle_time=30000,
                        message_ids=[msg['message_id']]
                    )
                    for cid, cdata in claimed:
                        print(f"Reprocessing claimed message {cid}")
                        r.xack(stream, group, cid)

        except Exception as e:
            print(f"Error: {e}")
            time.sleep(1)
```

## Step 6: Stream Trimming and Retention

Manage stream size to prevent unbounded growth:

```bash
# Trim stream to keep only the last 10000 entries
XTRIM orders MAXLEN 10000

# Approximate trimming (faster, slightly over limit)
XTRIM orders MAXLEN ~ 10000

# Trim by minimum ID (time-based retention)
XTRIM orders MINID 1709000000000-0

# Set up automatic trimming with XADD
XADD orders MAXLEN ~ 10000 * event "new-order" data "..."
```

## Monitoring Redis Streams

Key commands for monitoring stream health:

```bash
# Stream information
XINFO STREAM orders FULL

# Consumer group information
XINFO GROUPS orders

# Consumer information within a group
XINFO CONSUMERS orders order-processors

# Memory usage of a stream
MEMORY USAGE orders
```

## High Availability with Redis Sentinel

For production, deploy Redis with Sentinel for automatic failover:

```yaml
# redis-sentinel.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-sentinel
  namespace: redis-streams
spec:
  serviceName: redis-sentinel
  replicas: 3
  selector:
    matchLabels:
      app: redis-sentinel
  template:
    metadata:
      labels:
        app: redis-sentinel
    spec:
      containers:
        - name: sentinel
          image: redis:7.2-alpine
          ports:
            - containerPort: 26379
          command:
            - redis-sentinel
            - /etc/sentinel/sentinel.conf
```

## Conclusion

Redis Streams on Talos Linux provides a lightweight alternative to full-blown message brokers for event streaming. The combination is ideal when you need ordered, persistent message delivery without the operational complexity of Kafka or Pulsar. Consumer groups give you distributed processing with automatic load balancing, and the familiar Redis interface means your team can get productive quickly. For moderate-scale streaming workloads where simplicity matters, Redis Streams on Talos Linux is a practical and efficient choice.
