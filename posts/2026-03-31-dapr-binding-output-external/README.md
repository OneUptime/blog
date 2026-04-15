# How to Use Dapr Output Bindings to Interface with External Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Output, Integration, Microservice

Description: Learn how to use Dapr output bindings to send data to external systems like databases, queues, and APIs without writing system-specific client code.

---

## What Are Dapr Output Bindings

Output bindings allow your application to trigger actions on external systems through a simple HTTP or gRPC call to the Dapr sidecar. Dapr handles the connection, authentication, and protocol details. You write the same code regardless of whether you are writing to Kafka, a database, or a storage bucket.

## How Output Bindings Work

1. Define a binding component YAML pointing at the external system
2. Call `POST /v1.0/bindings/{binding-name}` with your data and operation
3. Dapr translates the call into the appropriate protocol for the target system

## Defining an Output Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-storage
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
  - name: bucket
    value: my-orders-bucket
  - name: region
    value: us-east-1
  - name: accessKey
    secretKeyRef:
      name: aws-secret
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-secret
      key: secretKey
```

## Invoking an Output Binding

```bash
curl -X POST http://localhost:3500/v1.0/bindings/order-storage \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": "Order 1001 processed at 2026-03-31T10:00:00Z",
    "metadata": {
      "key": "orders/1001.txt"
    }
  }'
```

## Common Output Binding Operations

Different binding types support different operations:

```text
bindings.aws.s3:     create, get, delete, list
bindings.kafka:      create
bindings.redis:      create, get, delete
bindings.postgresql: exec, query, close
bindings.http:       create (HTTP POST to a URL)
bindings.smtp:       create (send email)
```

## Using Output Bindings in Application Code

```python
import requests

def save_order_to_s3(order_id: str, content: str):
    response = requests.post(
        "http://localhost:3500/v1.0/bindings/order-storage",
        json={
            "operation": "create",
            "data": content,
            "metadata": {
                "key": f"orders/{order_id}.json",
                "ContentType": "application/json",
            },
        },
    )
    response.raise_for_status()
    print(f"Saved order {order_id} to S3")
```

## Sending to Multiple External Systems

Define multiple binding components and invoke them independently:

```typescript
async function processOrder(order: Order) {
  // Save to database
  await invokeBinding("postgres-db", "exec", undefined, {
    sql: "INSERT INTO orders (id, status) VALUES ($1, $2)",
    params: JSON.stringify([order.id, "created"]),
  });

  // Notify via SMS
  await invokeBinding("twilio-sms", "create", {
    toNumber: order.customerPhone,
    body: `Order ${order.id} confirmed`,
  });

  // Archive to S3
  await invokeBinding("order-archive", "create", JSON.stringify(order), {
    key: `orders/${order.id}.json`,
  });
}

async function invokeBinding(name: string, operation: string, data: unknown, metadata?: Record<string, string>) {
  await fetch(`http://localhost:3500/v1.0/bindings/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, data, metadata }),
  });
}
```

## Summary

Dapr output bindings provide a unified API for sending data to external systems. By defining binding components and calling the Dapr HTTP endpoint with an operation and payload, you avoid writing system-specific SDKs and can swap the underlying target by changing only the component YAML.
