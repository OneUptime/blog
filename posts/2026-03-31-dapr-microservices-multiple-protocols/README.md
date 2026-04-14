# How to Configure Dapr for Microservices with Different Protocols

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Protocol, gRPC, HTTP, Microservice

Description: Learn how to configure Dapr to support a mixed microservice environment where some services use HTTP and others use gRPC.

---

## Overview

Real-world microservice architectures often include services using different protocols - legacy HTTP/1.1 REST services alongside modern gRPC services, or polyglot systems where each language prefers different communication styles. Dapr seamlessly bridges these protocol differences.

## Per-Service Protocol Configuration

Each service independently declares its protocol:

```yaml
# HTTP service
annotations:
  dapr.io/app-protocol: "http"
  dapr.io/app-port: "8080"

# gRPC service
annotations:
  dapr.io/app-protocol: "grpc"
  dapr.io/app-port: "50051"

# HTTPS service (app uses TLS)
annotations:
  dapr.io/app-protocol: "https"
  dapr.io/app-port: "8443"
```

## HTTP Service Calling a gRPC Service

When an HTTP service invokes a gRPC service through Dapr, the Dapr sidecars handle protocol translation:

```python
import requests

# HTTP service calling a gRPC service via Dapr
response = requests.post(
    "http://localhost:3500/v1.0/invoke/grpc-service/method/ProcessOrder",
    json={"order_id": "123", "amount": 99.99},
    headers={"Content-Type": "application/json"}
)
print(response.json())
```

Dapr translates the HTTP request to gRPC on the receiving sidecar, invoking the gRPC service method.

## gRPC Service Calling an HTTP Service

```go
import dapr "github.com/dapr/go-sdk/client"

func callHttpService(ctx context.Context) {
    client, _ := dapr.NewClient()
    defer client.Close()

    // Dapr translates gRPC to HTTP for the target service
    resp, err := client.InvokeMethod(ctx,
        "http-service",         // target app-id
        "api/orders",           // method path
        "get",                  // HTTP verb
    )
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Response: %s", string(resp))
}
```

## Pub/Sub Across Mixed Protocol Services

Pub/sub works the same regardless of protocol - each service subscribes in its own language:

```javascript
// Node.js HTTP service subscribing
app.get('/dapr/subscribe', (req, res) => {
    res.json([{
        pubsubname: "pubsub",
        topic: "orders",
        route: "/process-order"
    }]);
});
```

```go
// Go gRPC service subscribing
func (s *server) ListTopicSubscriptions(ctx context.Context,
    req *pb.Empty) (*pb.ListTopicSubscriptionsResponse, error) {
    return &pb.ListTopicSubscriptionsResponse{
        Subscriptions: []*pb.TopicSubscription{
            {PubsubName: "pubsub", Topic: "orders"},
        },
    }, nil
}
```

## Handling Serialization Differences

When HTTP JSON services and gRPC Protobuf services share data, use a common schema:

```protobuf
// order.proto - shared schema
syntax = "proto3";
package orders;

message Order {
    string order_id = 1;
    double amount = 2;
    string customer_id = 3;
}
```

Generate types for each language and ensure JSON field names match protobuf field names.

## Debugging Protocol Issues

Enable debug logging to trace protocol translation:

```yaml
annotations:
  dapr.io/log-level: "debug"
```

Check sidecar logs for protocol negotiation:

```bash
kubectl logs -l app=grpc-service -c daprd | grep "protocol\|grpc\|http"
```

## Summary

Dapr's protocol abstraction enables HTTP and gRPC services to communicate seamlessly through the sidecar. Each service declares its own protocol via annotations, and Dapr handles translation at the sidecar level. This allows you to migrate services from HTTP to gRPC incrementally without breaking cross-service communication.
