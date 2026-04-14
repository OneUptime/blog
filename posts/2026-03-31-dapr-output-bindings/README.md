# How to Use Dapr Output Bindings to Call External Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Output Binding, Integration, External Service, Microservice

Description: Use Dapr output bindings to invoke external systems like databases, queues, email services, and storage from your application via a consistent HTTP API.

---

## What Are Dapr Output Bindings?

Output bindings allow your application to invoke external systems through the Dapr sidecar using a simple HTTP call. Instead of adding SDK dependencies for each external system (S3, SendGrid, Twilio, Kafka, etc.), you configure a Dapr binding component and call it via the `/v1.0/bindings` endpoint.

Output bindings support targets like AWS S3, Azure Blob Storage, Kafka, SendGrid, PostgreSQL, Redis, HTTP endpoints, and more.

## How Output Bindings Work

```mermaid
flowchart LR
    App[Your Application] -->|POST /v1.0/bindings/s3-bucket| Sidecar[Dapr Sidecar]
    Sidecar -->|SDK Call| Target[External System\ne.g. S3, SendGrid, Kafka]
    Target -->|Response| Sidecar
    Sidecar -->|Response| App
```

## Prerequisites

- Dapr initialized
- A binding component configured with `direction: output`

## Configuring an Output Binding

### AWS S3 Output Binding

```yaml
# s3-output.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: s3-bucket
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
  - name: bucket
    value: "my-dapr-bucket"
  - name: region
    value: "us-east-1"
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
  - name: direction
    value: "output"
```

## Invoking an Output Binding via HTTP API

The output binding API:

```text
POST http://localhost:3500/v1.0/bindings/{binding-name}
```

Body format:

```json
{
  "data": "<payload>",
  "metadata": {},
  "operation": "<operation-name>"
}
```

### Upload to S3

```bash
curl -X POST http://localhost:3500/v1.0/bindings/s3-bucket \
  -H "Content-Type: application/json" \
  -d '{
    "data": "Hello, this is file content!",
    "metadata": {
      "key": "reports/daily-2026-03-31.txt"
    },
    "operation": "create"
  }'
```

### Download from S3

```bash
curl -X POST http://localhost:3500/v1.0/bindings/s3-bucket \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "key": "reports/daily-2026-03-31.txt"
    },
    "operation": "get"
  }'
```

## Python Examples

### S3 Upload

```python
import requests
import os

DAPR_HTTP_PORT = os.environ.get("DAPR_HTTP_PORT", "3500")

def invoke_binding(binding_name, operation, data=None, metadata=None):
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/{binding_name}"
    payload = {
        "operation": operation,
        "data": data,
        "metadata": metadata or {}
    }
    resp = requests.post(url, json=payload)
    resp.raise_for_status()
    return resp

# Upload a file to S3
report_content = "Date,Revenue\n2026-03-31,9999.99\n"
invoke_binding("s3-bucket", "create", data=report_content, metadata={
    "key": "reports/revenue-2026-03-31.csv",
    "contentType": "text/csv"
})
print("Report uploaded to S3")

# Delete a file from S3
invoke_binding("s3-bucket", "delete", metadata={
    "key": "reports/old-report.csv"
})
print("Old report deleted")
```

### SendGrid Email Output Binding

Configure the binding:

```yaml
# sendgrid-output.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sendgrid
spec:
  type: bindings.twilio.sendgrid
  version: v1
  metadata:
  - name: apiKey
    secretKeyRef:
      name: sendgrid-secret
      key: apiKey
  - name: direction
    value: "output"
```

Send an email:

```python
def send_email(to_email, to_name, subject, html_content):
    payload = {
        "operation": "create",
        "metadata": {
            "emailFrom": "noreply@myapp.com",
            "emailFromName": "My App",
            "emailTo": to_email,
            "emailToName": to_name,
            "subject": subject
        },
        "data": html_content
    }
    resp = requests.post(
        f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/sendgrid",
        json=payload
    )
    resp.raise_for_status()
    print(f"Email sent to {to_email}")

send_email(
    "alice@example.com", "Alice",
    "Order Confirmation",
    "<h1>Your order ORD-001 has been confirmed!</h1>"
)
```

## Kafka Output Binding

```yaml
# kafka-output.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-producer
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: "localhost:9092"
  - name: publishTopic
    value: "events"
  - name: direction
    value: "output"
```

```python
def publish_to_kafka(topic, key, message):
    payload = {
        "operation": "create",
        "data": message,
        "metadata": {
            "key": key,
            "topic": topic
        }
    }
    requests.post(
        f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/kafka-producer",
        json=payload
    ).raise_for_status()

publish_to_kafka("events", "order-001", {"orderId": "ORD-001", "status": "shipped"})
```

## Go Example

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "log"
)

type BindingRequest struct {
    Data      interface{}       `json:"data"`
    Metadata  map[string]string `json:"metadata"`
    Operation string            `json:"operation"`
}

func invokeBinding(bindingName, operation string, data interface{}, meta map[string]string) error {
    req := BindingRequest{
        Data:      data,
        Metadata:  meta,
        Operation: operation,
    }
    body, _ := json.Marshal(req)
    url := fmt.Sprintf("http://localhost:3500/v1.0/bindings/%s", bindingName)
    resp, err := http.Post(url, "application/json", bytes.NewBuffer(body))
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    if resp.StatusCode >= 300 {
        return fmt.Errorf("binding invocation failed: %d", resp.StatusCode)
    }
    return nil
}

func main() {
    // Upload to S3
    err := invokeBinding("s3-bucket", "create",
        "Report content",
        map[string]string{"key": "output/report.txt"},
    )
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Uploaded to S3")
}
```

## PostgreSQL Output Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: postgres-output
spec:
  type: bindings.postgresql
  version: v1
  metadata:
  - name: connectionString
    value: "host=localhost user=postgres password=secret dbname=mydb sslmode=disable"
  - name: direction
    value: "output"
```

```python
invoke_binding("postgres-output", "exec", metadata={
    "sql": "INSERT INTO audit_log (action, user_id, timestamp) VALUES ($1, $2, NOW())",
    "params": '["order_created", "USR-001"]'
})
```

## Summary

Dapr output bindings provide a uniform HTTP API for invoking external systems - S3, SendGrid, Kafka, databases, HTTP endpoints - without adding their SDKs to your application. Configure the binding component YAML, then call `/v1.0/bindings/{name}` with the operation and payload. The sidecar translates the request to the native protocol of the target system.
