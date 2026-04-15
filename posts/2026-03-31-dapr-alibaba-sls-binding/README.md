# How to Use Dapr Alibaba Cloud SLS Binding for Log Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Alibaba Cloud, Log Storage, Output Binding

Description: Learn how to configure and use the Dapr Alibaba Cloud SLS output binding to send structured log data to Alibaba Log Service from your microservices.

---

Alibaba Cloud Log Service (SLS) is a fully managed observability platform for log data collection, storage, and analysis. Dapr provides a native output binding for SLS, allowing microservices to push log entries without managing SDK dependencies directly.

## Prerequisites

- Dapr CLI installed and initialized
- Alibaba Cloud account with SLS project and logstore created
- Access key ID and secret with SLS write permissions

## Configuring the SLS Binding Component

Create a component YAML file for the binding:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: alicloud-sls
  namespace: default
spec:
  type: bindings.alicloud.sls
  version: v1
  metadata:
  - name: AccessKeyID
    value: "YOUR_ACCESS_KEY_ID"
  - name: AccessKeySecret
    secretKeyRef:
      name: alibaba-secrets
      key: accessKeySecret
  - name: Endpoint
    value: "cn-hangzhou.log.aliyuncs.com"
```

The component only requires the authentication and endpoint configuration. The `project`, `logstore`, `topic`, and `source` fields are provided per request as invocation metadata.

Store the secret securely using a Kubernetes secret:

```bash
kubectl create secret generic alibaba-secrets \
  --from-literal=accessKeySecret=YOUR_SECRET_KEY
```

## Invoking the SLS Binding

Use the Dapr HTTP API to push a log entry:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/alicloud-sls \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "level": "INFO",
      "message": "Order processed successfully",
      "orderId": "ORD-12345",
      "userId": "USR-789"
    },
    "metadata": {
      "project": "my-log-project",
      "logstore": "app-logs",
      "topic": "service-events",
      "source": "order-service"
    },
    "operation": "create"
  }'
```

## Using the Binding in a Go Application

```go
package main

import (
  "context"
  dapr "github.com/dapr/go-sdk/client"
)

func sendLog(ctx context.Context, client dapr.Client, message string) error {
  data := map[string]interface{}{
    "level":   "INFO",
    "message": message,
    "service": "order-service",
  }

  in := &dapr.InvokeBindingRequest{
    Name:      "alicloud-sls",
    Operation: "create",
    Data:      mustMarshal(data),
    Metadata: map[string]string{
      "project":  "my-log-project",
      "logstore": "app-logs",
      "topic":    "service-events",
      "source":   "order-service",
    },
  }

  return client.InvokeOutputBinding(ctx, in)
}
```

## Structuring Log Topics

SLS uses topics to categorize log entries within a logstore. You can set a different topic per invocation to route logs into separate categories:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/alicloud-sls \
  -H "Content-Type: application/json" \
  -d '{
    "data": {"event": "payment_failed", "amount": 99.99},
    "metadata": {
      "project": "my-log-project",
      "logstore": "app-logs",
      "topic": "payment-errors",
      "source": "payment-service"
    },
    "operation": "create"
  }'
```

## Best Practices

- Use dedicated logstores per service to simplify log querying and access control.
- Set meaningful topic names to enable fast filtering in SLS dashboards.
- Avoid logging sensitive PII data; use field-level redaction before invoking the binding.
- Use Dapr secrets management to handle access key rotation without redeploying components.

## Summary

The Dapr Alibaba Cloud SLS binding provides a straightforward way to route structured log data from microservices to Alibaba Log Service. By externalizing the SLS SDK configuration into a Dapr component, you decouple your application code from cloud-specific logging dependencies. This pattern works well for multi-cloud setups where different environments target different log backends.
