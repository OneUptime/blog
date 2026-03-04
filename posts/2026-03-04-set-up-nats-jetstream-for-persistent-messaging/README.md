# How to Set Up NATS JetStream for Persistent Messaging on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, NATS, Message Broker, Linux

Description: Learn how to set Up NATS JetStream for Persistent Messaging on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

NATS JetStream adds persistence, at-least-once delivery, and stream processing capabilities to the NATS messaging system. It provides a built-in distributed storage layer for messages that need to survive broker restarts.

## Prerequisites

- RHEL 9 with NATS server installed
- Root or sudo access

## Step 1: Enable JetStream

Add to the NATS configuration:

```bash
sudo vi /etc/nats/nats-server.conf
```

```
port: 4222

jetstream {
    store_dir: /var/lib/nats/jetstream
    max_mem: 1G
    max_file: 10G
}
```

```bash
sudo mkdir -p /var/lib/nats/jetstream
sudo chown nats:nats /var/lib/nats/jetstream
sudo systemctl restart nats
```

## Step 2: Create a Stream

```bash
nats stream add ORDERS   --subjects "orders.>"   --retention limits   --max-msgs=-1   --max-bytes=-1   --max-age 24h   --storage file   --replicas 1   --server nats://localhost:4222
```

## Step 3: Create a Consumer

```bash
nats consumer add ORDERS order-processor   --ack explicit   --deliver all   --max-deliver 3   --filter "orders.new"   --server nats://localhost:4222
```

## Step 4: Publish Messages

```bash
nats pub orders.new '{"id": 1, "item": "widget"}' --server nats://localhost:4222
nats pub orders.new '{"id": 2, "item": "gadget"}' --server nats://localhost:4222
```

## Step 5: Consume with Acknowledgment

```bash
nats consumer next ORDERS order-processor --count 5 --server nats://localhost:4222
```

## Step 6: Monitor Streams

```bash
nats stream info ORDERS --server nats://localhost:4222
nats stream ls --server nats://localhost:4222
```

## Step 7: Key-Value Store

JetStream includes a built-in key-value store:

```bash
nats kv add CONFIG --server nats://localhost:4222
nats kv put CONFIG db.host "10.0.1.10" --server nats://localhost:4222
nats kv get CONFIG db.host --server nats://localhost:4222
```

## Conclusion

NATS JetStream adds enterprise messaging capabilities to NATS on RHEL 9, including persistent streams, durable consumers, and a key-value store. It provides at-least-once delivery guarantees while maintaining the simplicity and performance that NATS is known for.
