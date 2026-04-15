# How to Use the Dapr Bindings API Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, API, Input, Output

Description: A practical reference for the Dapr Bindings API covering output binding invocations, input binding triggers, and supported operations.

---

## Overview

The Dapr Bindings API connects your application to external systems - message queues, storage, databases, and cloud services - without SDKs for each system. Output bindings let your app invoke actions on external systems, while input bindings deliver events from external systems to your app.

## Output Binding: Invoke an Operation

**POST** `/v1.0/bindings/{bindingName}`

Send an email via an SMTP output binding:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/smtp-binding \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": "Your order has been shipped.",
    "metadata": {
      "emailTo": "customer@example.com",
      "subject": "Order Shipped"
    }
  }'
```

## Common Output Binding Operations

| Binding Type | Operations |
|---|---|
| `bindings.kafka` | create |
| `bindings.aws.s3` | create, get, delete, list |
| `bindings.azure.blobstorage` | create, get, delete, list |
| `bindings.postgresql` | exec, query, close |
| `bindings.twilio.sms` | create |

## Writing to S3

```bash
curl -X POST http://localhost:3500/v1.0/bindings/s3-binding \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": "report data here",
    "metadata": {
      "key": "reports/2026-03-31-daily.txt"
    }
  }'
```

## Reading from S3

```bash
curl -X POST http://localhost:3500/v1.0/bindings/s3-binding \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "get",
    "metadata": {
      "key": "reports/2026-03-31-daily.txt"
    }
  }'
```

## Running a SQL Query via PostgreSQL Binding

```bash
curl -X POST http://localhost:3500/v1.0/bindings/pg-binding \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "query",
    "metadata": {
      "sql": "SELECT id, name, status FROM orders WHERE status = $1",
      "params": "[\"pending\"]"
    }
  }'
```

## Input Binding: Receiving Events

For input bindings, Dapr delivers events to your app via POST:

```javascript
// Your app receives incoming binding events at:
// POST /{bindingName}

app.post("/kafka-orders-binding", (req, res) => {
  const event = req.body;
  console.log("Received binding event:", event);
  processOrder(event);
  res.status(200).send();
});
```

## Input Binding Component Definition

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-orders-binding
spec:
  type: bindings.kafka
  version: v1
  metadata:
    - name: brokers
      value: kafka:9092
    - name: topics
      value: orders
    - name: consumerGroup
      value: order-processor
    - name: authType
      value: "none"
```

## Invoking from Code (Node.js SDK)

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

await client.binding.send("smtp-binding", "create", "Your order shipped", {
  emailTo: "user@example.com",
  subject: "Shipped!"
});
```

## Summary

The Dapr Bindings API provides a unified interface for integrating with external systems through output and input bindings. Output bindings reduce boilerplate by abstracting cloud service SDKs, while input bindings make your app reactive to external events without polling. The same API works whether the backend is Kafka, S3, PostgreSQL, or any supported binding type.
