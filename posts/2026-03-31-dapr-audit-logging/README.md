# How to Implement Audit Logging with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Audit, Logging, Observability, Compliance

Description: Learn how to implement comprehensive audit logging in Dapr applications using middleware, output bindings, and structured log forwarding to centralized systems.

---

## Why Audit Logging Is Different from Operational Logging

Operational logs help debug issues. Audit logs prove that specific actions were taken by specific actors at specific times. Audit logs must be tamper-evident, retained for defined periods, and queryable for compliance reviews. Dapr provides several mechanisms to implement audit logging without burdening individual services.

## Using Dapr Configuration for Centralized Audit Capture

Enable API logging and distributed tracing in a Dapr Configuration resource to capture all sidecar API operations as audit records:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: audit-pipeline-config
  namespace: production
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector:4317"
      isSecure: false
      protocol: grpc
  logging:
    apiLogging:
      enabled: true
      omitHealthChecks: true
```

## Writing Audit Events via Output Binding

Use a dedicated output binding to write audit events to a durable sink:

```go
package main

import (
    "context"
    "encoding/json"
    "time"

    dapr "github.com/dapr/go-sdk/client"
)

type AuditEvent struct {
    ID         string    `json:"id"`
    Timestamp  time.Time `json:"timestamp"`
    ActorID    string    `json:"actorId"`
    ActorType  string    `json:"actorType"`
    Action     string    `json:"action"`
    Resource   string    `json:"resource"`
    Result     string    `json:"result"`
    IPAddress  string    `json:"ipAddress"`
    TraceID    string    `json:"traceId"`
}

func auditAction(client dapr.Client, event AuditEvent) error {
    event.ID = generateUUID()
    event.Timestamp = time.Now()

    data, err := json.Marshal(event)
    if err != nil {
        return err
    }

    return client.InvokeOutputBinding(
        context.Background(),
        &dapr.InvokeBindingRequest{
            Name:      "audit-log-binding",
            Operation: "create",
            Data:      data,
        },
    )
}
```

## Configuring the Audit Output Binding

Write audit events to an S3-compatible object store for long-term immutable retention:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: audit-log-binding
  namespace: production
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
  - name: bucket
    value: "my-audit-logs"
  - name: region
    value: "us-east-1"
  - name: accessKey
    secretKeyRef:
      name: aws-s3-secret
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-s3-secret
      key: secretKey
  - name: storageClass
    value: "GLACIER"
scopes:
- payment-service
- user-service
- order-service
```

## Subscribing to Audit Events for Real-Time Monitoring

Publish audit events to a topic for real-time SIEM integration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: audit-events-siem
  namespace: production
spec:
  pubsubname: pubsub
  topic: audit-events
  route: /siem/ingest
scopes:
- siem-connector
```

```python
# siem_connector.py - subscribes and forwards to SIEM
from dapr.ext.fastapi import DaprApp
from fastapi import FastAPI
import httpx

app = FastAPI()
dapr_app = DaprApp(app)

@dapr_app.subscribe(pubsub="pubsub", topic="audit-events")
async def forward_to_siem(event: dict):
    async with httpx.AsyncClient() as client:
        await client.post(
            "https://siem.internal/api/events",
            json=event["data"],
            headers={"Authorization": f"Bearer {SIEM_TOKEN}"}
        )
    return {"status": "SUCCESS"}
```

## Querying Audit Logs

```bash
# Query audit events from S3/Glacier using Athena
aws athena start-query-execution \
  --query-string "SELECT * FROM audit_logs WHERE actorId = 'user123' AND timestamp > '2026-01-01'" \
  --query-execution-context Database=audit_db \
  --result-configuration OutputLocation=s3://query-results/
```

## Summary

Dapr audit logging is best implemented as a cross-cutting concern using output bindings to write audit events to immutable sinks like S3 Glacier or append-only Kafka topics. Enable sidecar API logging for a complete record of all Dapr API calls, and publish structured audit events to a pub/sub topic for real-time SIEM integration. Design audit event schemas with actor identity, action, resource, result, and trace ID fields to make compliance queries efficient and meaningful.
