# How to Implement Message Priority with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Message Priority, Pub/Sub, RabbitMQ, Messaging

Description: Learn how to implement message priority queuing with Dapr pub/sub using RabbitMQ priority queues and separate topics to process high-priority messages first.

---

## Message Priority in Event-Driven Systems

Not all messages are equally urgent. A critical payment failure alert should be processed before a routine weekly report. Dapr pub/sub supports message priority in two ways: using a priority-capable broker like RabbitMQ with priority queues, or using separate topics with dedicated consumers at different polling rates.

## Approach 1 - Priority Topics

The simplest approach is to create separate topics for each priority level and assign different consumer resources to each:

```python
import httpx
from enum import IntEnum

DAPR_HTTP_PORT = 3500

class Priority(IntEnum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

PRIORITY_TOPICS = {
    Priority.LOW: "tasks-low",
    Priority.NORMAL: "tasks-normal",
    Priority.HIGH: "tasks-high",
    Priority.CRITICAL: "tasks-critical"
}

async def publish_task(task: dict, priority: Priority):
    topic = PRIORITY_TOPICS[priority]
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/{topic}",
            json={**task, "priority": priority.value}
        )

# Usage
await publish_task({"taskId": "t-001", "type": "report"}, Priority.LOW)
await publish_task({"taskId": "t-002", "type": "payment-failure"}, Priority.CRITICAL)
```

Deploy more consumer replicas for high-priority topics:

```yaml
# High priority consumer - 5 replicas
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-consumer-critical
spec:
  replicas: 5
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: task-consumer-critical

# Low priority consumer - 1 replica
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-consumer-low
spec:
  replicas: 1
```

## Approach 2 - RabbitMQ Priority Queues

RabbitMQ supports native message priority (0-9). Configure the Dapr RabbitMQ component and subscription with `maxPriority`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: priority-pubsub
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: host
    value: amqp://guest:guest@rabbitmq:5672
  - name: consumerID
    value: task-processor
---
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: task-subscription
spec:
  topic: tasks
  routes:
    default: /process-task
  pubsubname: priority-pubsub
  metadata:
    maxPriority: "9"
```

Publish with a priority level via query parameter metadata:

```python
async def publish_with_priority(task: dict, priority: int):
    """Priority 0-9, higher values are processed first."""
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/priority-pubsub/tasks",
            json=task,
            params={"metadata.priority": str(priority)},
            headers={"Content-Type": "application/json"}
        )

await publish_with_priority({"taskId": "weekly-report"}, priority=1)
await publish_with_priority({"taskId": "payment-failure"}, priority=9)
```

RabbitMQ delivers priority 9 messages before priority 1 messages when multiple are queued.

## Consumer Processing with Priority Awareness

Add priority to the event payload for application-level processing decisions:

```python
from fastapi import FastAPI, Request
import asyncio

app = FastAPI()

@app.post("/process-task")
async def process_task(request: Request):
    body = await request.json()
    task = body.get("data", {})
    priority = task.get("priority", 5)

    if priority >= 8:
        # Critical - process immediately
        await handle_task_urgent(task)
    elif priority >= 5:
        # Normal - process with standard handling
        await handle_task_normal(task)
    else:
        # Low - can be batched or delayed
        await handle_task_low(task)

    return {"status": "SUCCESS"}
```

## Monitoring Queue Depths by Priority

Monitor that high-priority queues are not backing up:

```bash
# Check RabbitMQ queue depths via management API
curl -u guest:guest http://rabbitmq:15672/api/queues | jq '.[] | {name, messages, consumers}'
```

Alert when high-priority queues grow beyond a threshold, indicating consumer lag on critical messages.

## Summary

Implementing message priority with Dapr involves choosing between dedicated priority topics (simple, any broker) or native priority queues (RabbitMQ with `maxPriority` in the subscription metadata). Priority topics give the most control through resource allocation, while RabbitMQ native priority provides broker-level ordering guarantees. Both approaches integrate cleanly with Dapr's pub/sub API without requiring changes to how subscribers are written.
