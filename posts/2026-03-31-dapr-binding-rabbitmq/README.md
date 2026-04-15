# How to Use Dapr RabbitMQ Binding for Message Queuing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, RabbitMQ, Message Queue, Microservice

Description: Learn how to configure and use the Dapr RabbitMQ binding to send and receive messages from RabbitMQ queues using Dapr's standard binding API.

---

## When to Use Dapr RabbitMQ Binding vs Pub/Sub

Dapr offers both a RabbitMQ pub/sub component and a RabbitMQ binding component. Use bindings when you need simple send/receive operations with specific queues. Use pub/sub for topic-based fan-out with multiple independent subscribers.

## Start RabbitMQ Locally

```bash
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

## Configure the RabbitMQ Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rabbitmq-binding
spec:
  type: bindings.rabbitmq
  version: v1
  metadata:
  - name: queueName
    value: task-queue
  - name: host
    value: amqp://guest:guest@localhost:5672
  - name: durable
    value: "true"
  - name: deleteWhenUnused
    value: "false"
  - name: ttlInSeconds
    value: "60"
  - name: maxPriority
    value: "5"
  - name: prefetchCount
    value: "0"
  - name: exclusive
    value: "false"
```

## Send a Message (Output Binding)

```bash
curl -X POST http://localhost:3500/v1.0/bindings/rabbitmq-binding \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {
      "taskId": "task-001",
      "type": "image-resize",
      "imageUrl": "https://example.com/photo.jpg"
    }
  }'
```

## Send with Priority

```bash
curl -X POST http://localhost:3500/v1.0/bindings/rabbitmq-binding \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {"taskId": "urgent-001", "type": "critical-job"},
    "metadata": {
      "priority": "5"
    }
  }'
```

## Receive Messages (Input Binding)

When the binding acts as an input trigger, Dapr calls your application endpoint when a message arrives. The endpoint name matches the binding name by default:

```javascript
const express = require("express");
const app = express();
app.use(express.json());

// Dapr calls this endpoint when a message arrives
app.post("/rabbitmq-binding", async (req, res) => {
  const task = req.body;
  console.log("Received task:", task.taskId, task.type);

  try {
    await executeTask(task);
    res.sendStatus(200); // Acknowledge - message removed from queue
  } catch (err) {
    console.error("Task failed:", err.message);
    res.status(500).send(); // Nack - message requeued
  }
});

app.listen(3000);
```

## Using in Application Code

```python
import requests

class TaskQueue:
    def __init__(self, dapr_port=3500):
        self.base_url = f"http://localhost:{dapr_port}"

    def enqueue(self, task: dict, priority: int = 0):
        metadata = {}
        if priority > 0:
            metadata["priority"] = str(priority)

        response = requests.post(
            f"{self.base_url}/v1.0/bindings/rabbitmq-binding",
            json={
                "operation": "create",
                "data": task,
                "metadata": metadata,
            },
        )
        response.raise_for_status()

queue = TaskQueue()
queue.enqueue({"taskId": "t-100", "type": "report-generation"}, priority=3)
```

## Summary

The Dapr RabbitMQ binding provides a simple API for enqueueing and consuming messages from RabbitMQ queues. Configure queue durability, TTL, and priority using component metadata fields. As an output binding, your app sends data via POST; as an input binding, Dapr triggers your endpoint when messages arrive.
