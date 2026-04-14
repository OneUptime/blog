# How to Configure Dapr for Service-to-Service Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, mTLS, HTTP, gRPC

Description: Learn how to configure Dapr for service-to-service communication with mTLS, load balancing, retries, and both HTTP and gRPC transport options.

---

## Service-to-Service Communication in Dapr

Dapr's service invocation building block provides direct service-to-service communication with automatic mTLS encryption, service discovery, load balancing, and observability. Services call each other using logical app IDs rather than network addresses, and Dapr handles the rest.

## Basic HTTP Service Invocation

Deploy two services with Dapr sidecars and call between them:

```yaml
# Annotate your Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
        dapr.io/app-protocol: "http"
```

Call from the order service to the payment service:

```python
from dapr.clients import DaprClient
import json

def process_payment(order_id: str, amount: float):
    with DaprClient() as client:
        response = client.invoke_method(
            app_id="payment-service",
            method_name="charge",
            data=json.dumps({"orderId": order_id, "amount": amount}),
            content_type="application/json",
            http_verb="POST"
        )
        return json.loads(response.data)
```

## gRPC Service Invocation

For high-throughput or streaming scenarios, use gRPC:

```yaml
annotations:
  dapr.io/app-id: "inventory-service"
  dapr.io/app-port: "50051"
  dapr.io/app-protocol: "grpc"
```

```go
import (
    dapr "github.com/dapr/go-sdk/client"
    "google.golang.org/protobuf/proto"
)

func checkInventory(ctx context.Context, productId string) (*InventoryResponse, error) {
    client, err := dapr.NewClient()
    if err != nil {
        return nil, err
    }
    defer client.Close()

    req := &InventoryRequest{ProductId: productId}
    data, _ := proto.Marshal(req)

    resp, err := client.InvokeMethodWithContent(ctx,
        "inventory-service",
        "check",
        "post",
        &dapr.DataContent{Data: data, ContentType: "application/x-protobuf"},
    )
    if err != nil {
        return nil, err
    }

    var result InventoryResponse
    proto.Unmarshal(resp, &result)
    return &result, nil
}
```

## Configuring mTLS

mTLS is enabled by default in Kubernetes. Verify it is active:

```bash
kubectl get configurations/daprsystem -n dapr-system -o jsonpath='{.spec.mtls}'
```

For self-hosted environments, configure mTLS explicitly:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: app-config
spec:
  mtls:
    enabled: true
    workloadCertTTL: "24h"
    allowedClockSkew: "15m"
```

## Load Balancing with Multiple Replicas

Dapr automatically load balances across replicas of the target service. Scale up and verify distribution:

```bash
kubectl scale deployment payment-service --replicas=3
```

## Resiliency for Service Calls

Add retry and circuit breaker policies:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: service-resiliency
spec:
  policies:
    retries:
      defaultRetry:
        policy: exponential
        maxRetries: 3
        maxInterval: 15s
    timeouts:
      shortTimeout: 5s
  targets:
    apps:
      payment-service:
        timeout: shortTimeout
        retry: defaultRetry
```

## Summary

Dapr service-to-service communication provides automatic mTLS, service discovery, and load balancing for both HTTP and gRPC workloads. Applications use logical app IDs so deployment topology can change without code updates. Combining service invocation with Dapr resiliency policies adds retry, timeout, and circuit breaker behavior declaratively without library dependencies.
