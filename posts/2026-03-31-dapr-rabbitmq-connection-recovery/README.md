# How to Handle RabbitMQ Connection Recovery with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, RabbitMQ, Connection Recovery, Resilience, Pub/Sub, Messaging

Description: Configure Dapr's RabbitMQ pub/sub component for automatic connection recovery, ensuring resilient messaging during network interruptions.

---

## Overview

RabbitMQ connections can fail due to network interruptions, broker restarts, or resource exhaustion. Dapr's RabbitMQ pub/sub component includes built-in reconnection logic, but proper configuration is essential to ensure messages are not lost and consumers recover quickly.

## RabbitMQ High Availability Setup

Configure a RabbitMQ cluster with quorum queues for durability:

```bash
# Start a RabbitMQ cluster with Docker Compose
docker-compose up -d

# Declare a quorum queue (queue type must be set at declaration time, not via policy)
rabbitmqadmin declare queue name=orders durable=true \
  arguments='{"x-queue-type":"quorum"}' \
  -u admin -p secret
```

RabbitMQ Docker Compose for development:

```yaml
version: '3'
services:
  rabbitmq:
    image: rabbitmq:3.12-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: secret
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
volumes:
  rabbitmq-data:
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rabbitmq-pubsub
  namespace: default
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: host
    secretKeyRef:
      name: rabbitmq-secret
      key: connectionString
  - name: durable
    value: "true"
  - name: deletedWhenUnused
    value: "false"
  - name: autoAck
    value: "false"
  - name: reconnectWait
    value: "3"
  - name: concurrencyMode
    value: "parallel"
  - name: prefetchCount
    value: "10"
  - name: publisherConfirm
    value: "true"
  - name: enableDeadLetter
    value: "true"
  - name: maxLen
    value: "3000"
  - name: maxLenBytes
    value: "10485760"
  - name: exchangeKind
    value: "fanout"
```

Create the connection string secret:

```bash
kubectl create secret generic rabbitmq-secret \
  --from-literal=connectionString="amqp://admin:secret@rabbitmq:5672"
```

## Connection Recovery Configuration

The `reconnectWait` parameter (in seconds) controls how long Dapr waits between reconnection attempts. For production, combine this with exponential backoff in your application:

```go
package main

import (
    "context"
    "fmt"
    "time"

    dapr "github.com/dapr/go-sdk/client"
)

func publishWithRetry(orderData interface{}) error {
    maxRetries := 5
    backoff := time.Second

    for attempt := 0; attempt < maxRetries; attempt++ {
        client, err := dapr.NewClient()
        if err != nil {
            fmt.Printf("Attempt %d: failed to create client: %v\n", attempt+1, err)
            time.Sleep(backoff)
            backoff *= 2
            continue
        }

        ctx := context.Background()
        err = client.PublishEvent(ctx, "rabbitmq-pubsub", "orders", orderData)
        if err == nil {
            client.Close()
            return nil
        }

        client.Close()
        fmt.Printf("Attempt %d: publish failed: %v\n", attempt+1, err)
        time.Sleep(backoff)
        backoff *= 2
    }
    return fmt.Errorf("all %d publish attempts failed", maxRetries)
}
```

## Publisher Confirms for Guaranteed Delivery

With `publisherConfirm: "true"`, Dapr waits for RabbitMQ to acknowledge each published message:

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient({
  daprHost: '127.0.0.1',
  daprPort: '3500'
});

async function publishOrderSafely(order) {
  try {
    await client.pubsub.publish('rabbitmq-pubsub', 'orders', order);
    console.log(`Order ${order.id} confirmed by broker`);
  } catch (error) {
    console.error(`Failed to publish order ${order.id}:`, error.message);
    // Store in outbox for retry
    await saveToOutbox(order);
  }
}
```

## Dead Letter Queue Monitoring

Enable dead-letter routing for unprocessable messages:

```bash
# Check dead letter queue
rabbitmqadmin get queue=orders-dead-letter count=10 \
  -H localhost -u admin -p secret

# View DLQ statistics
rabbitmqctl list_queues name messages consumers \
  | grep dead-letter
```

## Summary

RabbitMQ connection recovery in Dapr relies on the `reconnectWait` parameter combined with publisher confirms and durable queues. Quorum queues provide the strongest durability guarantees, surviving broker node failures without data loss. Dead-letter queues capture messages that cannot be processed after exhausting retries, enabling manual inspection and reprocessing.
