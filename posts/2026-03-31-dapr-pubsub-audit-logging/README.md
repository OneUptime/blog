# How to Use Dapr Pub/Sub for Audit Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Audit, Logging, Compliance, Microservice

Description: Learn how to implement centralized audit logging across microservices using Dapr pub/sub to capture, route, and persist audit events reliably.

---

## Why Use Pub/Sub for Audit Logs

Audit logging requires reliable, tamper-resistant capture of user actions across services. Using Dapr pub/sub for audit events decouples audit collection from business logic and ensures logs are captured even when individual services are busy.

## Define the Audit Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: audit-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka:9092
  - name: consumerGroup
    value: audit-consumers
  - name: authType
    value: "none"
```

## Publish Audit Events from Services

Define a consistent audit event structure:

```typescript
interface AuditEvent {
  eventId: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  outcome: "success" | "failure";
  metadata?: Record<string, unknown>;
}

async function publishAuditEvent(event: AuditEvent): Promise<void> {
  await fetch("http://localhost:3500/v1.0/publish/audit-pubsub/audit-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
}

// Usage in a service handler
async function deleteUser(userId: string, requesterId: string) {
  await userRepo.delete(userId);
  await publishAuditEvent({
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userId: requesterId,
    action: "user.delete",
    resource: "user",
    resourceId: userId,
    outcome: "success",
  });
}
```

## Audit Log Consumer Service

A dedicated audit service subscribes and persists all events:

```python
from flask import Flask, request
import psycopg2
import json

app = Flask(__name__)

@app.route("/dapr/subscribe", methods=["GET"])
def subscribe():
    return [
        {
            "pubsubname": "audit-pubsub",
            "topic": "audit-events",
            "route": "/audit/ingest",
        }
    ]

@app.route("/audit/ingest", methods=["POST"])
def ingest_audit():
    event = request.json.get("data", {})
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO audit_log (event_id, timestamp, user_id, action,
              resource, resource_id, outcome, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (event_id) DO NOTHING
            """,
            (
                event["eventId"],
                event["timestamp"],
                event["userId"],
                event["action"],
                event["resource"],
                event["resourceId"],
                event["outcome"],
                json.dumps(event.get("metadata", {})),
            ),
        )
        conn.commit()
    return {"status": "SUCCESS"}, 200
```

## Routing Audit Events by Service

Use topic routing to send different event types to specialized handlers:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: audit-sub
spec:
  pubsubname: audit-pubsub
  topic: audit-events
  routes:
    rules:
    - match: event.data.action.startsWith("user.")
      path: /audit/user-events
    - match: event.data.action.startsWith("payment.")
      path: /audit/payment-events
    default: /audit/ingest
```

## Ensuring Durability

Configure the dead-letter topic to prevent audit event loss:

```yaml
spec:
  pubsubname: audit-pubsub
  topic: audit-events
  route: /audit/ingest
  deadLetterTopic: audit-dead-letter
```

Control retry behavior before messages are sent to the dead-letter topic using a Resiliency resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: audit-resiliency
spec:
  policies:
    retries:
      auditRetry:
        policy: constant
        duration: 5s
        maxRetries: 5
  targets:
    components:
      audit-pubsub:
        inbound:
          retry: auditRetry
```

## Summary

Dapr pub/sub provides a reliable, decoupled channel for centralized audit logging. Services publish structured audit events to a dedicated topic, and a consumer service persists them to a database. Topic routing and dead-letter configuration ensure no event is lost and different event categories receive appropriate handling.
