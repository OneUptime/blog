# How to Deploy NATS via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, NATS, Messaging, Docker, Microservice

Description: Deploy NATS high-performance messaging system using Portainer for cloud-native microservices communication.

## Introduction

NATS is a lightweight, high-performance messaging system designed for cloud-native applications. It supports publish-subscribe, request-reply, and queue group patterns with extremely low latency. NATS JetStream (included since NATS 2.2) adds persistence, stream replay, and consumer tracking.

## Prerequisites

- Portainer installed with Docker
- Basic understanding of publish-subscribe messaging

## Step 1: Deploy NATS with JetStream

Navigate to **Stacks** > **Add Stack** and use the following configuration:

```yaml
# docker-compose.yml - NATS with JetStream

version: "3.8"

services:
  nats:
    image: nats:2.14-alpine
    container_name: nats
    restart: unless-stopped
    ports:
      - "4222:4222"    # Client connections
      - "8222:8222"    # HTTP monitoring
      - "6222:6222"    # Cluster connections (for multi-node)
    command: >
      -js
      -sd /data
      -m 8222
      -n nats-server
    volumes:
      - nats_data:/data
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--output-document=-", "http://localhost:8222/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - nats_net

volumes:
  nats_data:

networks:
  nats_net:
    driver: bridge
```

## Step 2: Verify Deployment

```bash
# Check server health
curl http://localhost:8222/healthz
# Returns: {"status":"ok","now":"..."}

# View server info
curl http://localhost:8222/varz | python3 -m json.tool | grep -E "version|max_connections|uptime"

# Check JetStream status
curl http://localhost:8222/jsz
```

## Step 3: Install NATS CLI and Test

```bash
# Install nats CLI
curl -L https://github.com/nats-io/natscli/releases/download/v0.4.0/nats-0.4.0-linux-amd64.zip \
  -o nats.zip && unzip nats.zip && sudo install nats-0.4.0-linux-amd64/nats /usr/local/bin/nats

# Subscribe in one terminal
nats sub test.subject --server nats://localhost:4222

# Publish from another terminal
nats pub test.subject "Hello NATS!" --server nats://localhost:4222
```

## Step 4: JetStream Streams and Consumers

```bash
# Create a stream for order events
nats stream add ORDERS \
  --subjects "orders.>" \
  --storage file \
  --retention limits \
  --max-age 7d \
  --server nats://localhost:4222

# Create a durable consumer
nats consumer add ORDERS order-processor \
  --filter "orders.created" \
  --ack explicit \
  --deliver all \
  --pull \
  --defaults \
  --server nats://localhost:4222

# Publish to the stream
nats pub orders.created '{"id": "1234", "item": "widget"}' \
  --server nats://localhost:4222

# Consume messages
nats consumer next ORDERS order-processor \
  --server nats://localhost:4222
```

## Step 5: Python Client Example

```python
# pip install nats-py
import asyncio
import nats

async def main():
    nc = await nats.connect("nats://localhost:4222")

    # Create JetStream context
    js = nc.jetstream()

    # Publish
    await js.publish("orders.created", b'{"id": "1234"}')

    # Subscribe
    async def message_handler(msg):
        print(f"Received on {msg.subject}: {msg.data.decode()}")
        await msg.ack()

    await js.subscribe("orders.>", cb=message_handler, durable="my-consumer")

    await asyncio.sleep(5)
    await nc.drain()

asyncio.run(main())
```

## Step 6: NATS with Authentication

For production, enable token or credentials authentication:

```yaml
services:
  nats:
    image: nats:2.14-alpine
    command: >
      -js
      -sd /data
      -m 8222
      --auth my-secure-token-here
    volumes:
      - nats_data:/data
    networks:
      - nats_net
```

Connect with: `nats pub subject "msg" --server nats://my-secure-token-here@localhost:4222`

## Conclusion

NATS is exceptionally fast (millions of messages/second on modest hardware) and operationally simple. Use core NATS for ephemeral pub-sub patterns and fire-and-forget messaging. Enable JetStream (`-js`) when you need persistent streams, at-least-once delivery guarantees, or consumer tracking. The HTTP monitoring port (8222) provides real-time visibility into server and stream health without additional tooling.
