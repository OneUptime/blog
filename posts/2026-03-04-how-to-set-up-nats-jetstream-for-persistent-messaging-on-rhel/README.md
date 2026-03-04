# How to Set Up NATS JetStream for Persistent Messaging on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, NATS, JetStream, Persistent Messaging, Streaming

Description: Learn how to enable and configure NATS JetStream on RHEL for persistent, replay-capable message streaming with at-least-once delivery.

---

NATS JetStream is the built-in persistence layer for NATS. It provides durable message storage, replay capabilities, and consumer acknowledgment for reliable message delivery.

## Enabling JetStream

Add the JetStream configuration to your NATS server config:

```conf
# /etc/nats/nats-server.conf
server_name: nats-1
listen: 0.0.0.0:4222
http_port: 8222

jetstream {
    store_dir: /var/lib/nats/jetstream
    max_mem: 1G
    max_file: 10G
}
```

```bash
# Create the storage directory
sudo mkdir -p /var/lib/nats/jetstream
sudo chown nats:nats /var/lib/nats/jetstream

# Restart NATS to enable JetStream
sudo systemctl restart nats
```

## Creating a Stream

```bash
# Create a stream that captures all "orders" subjects
nats stream add ORDERS \
  --subjects "orders.>" \
  --retention limits \
  --max-msgs=-1 \
  --max-bytes=1073741824 \
  --max-age=72h \
  --storage file \
  --replicas 1 \
  --discard old

# List streams
nats stream list

# View stream info
nats stream info ORDERS
```

## Creating Consumers

```bash
# Create a durable push consumer
nats consumer add ORDERS order-processor \
  --filter "orders.created" \
  --ack explicit \
  --deliver all \
  --max-deliver 5 \
  --deliver-group order-workers

# Create a pull consumer
nats consumer add ORDERS order-analytics \
  --filter "orders.>" \
  --ack explicit \
  --deliver all \
  --pull
```

## Publishing and Consuming Messages

```bash
# Publish messages to the stream
nats pub orders.created '{"id": 1, "item": "widget", "qty": 5}'
nats pub orders.created '{"id": 2, "item": "gadget", "qty": 3}'
nats pub orders.shipped '{"id": 1, "tracking": "ABC123"}'

# Consume with a pull consumer
nats consumer next ORDERS order-analytics --count 10

# View stream messages
nats stream view ORDERS
```

## Monitoring JetStream

```bash
# Check JetStream account info
nats account info

# Monitor stream statistics
nats stream info ORDERS

# Check consumer lag
nats consumer info ORDERS order-processor

# HTTP monitoring endpoint
curl http://localhost:8222/jsz
```

## Key-Value Store

JetStream also provides a built-in key-value store:

```bash
# Create a key-value bucket
nats kv add CONFIG --history 5 --ttl 24h

# Put and get values
nats kv put CONFIG db.host "postgres.local"
nats kv put CONFIG db.port "5432"
nats kv get CONFIG db.host

# Watch for changes
nats kv watch CONFIG
```

JetStream supports three retention policies: limits (discard old messages when limits are reached), interest (keep messages while there are consumers), and workqueue (delete messages after acknowledgment). Choose based on your use case.
