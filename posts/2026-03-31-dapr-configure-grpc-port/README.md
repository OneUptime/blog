# How to Configure Dapr gRPC Port

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, gRPC, Port, Configuration, Kubernetes

Description: Configure the Dapr gRPC API port for application-to-sidecar communication, handle port conflicts, and use gRPC for high-performance service invocation.

---

## Dapr gRPC Port Basics

Dapr's gRPC API port (default: 50001) allows your application to communicate with the Dapr sidecar using the gRPC protocol. Using gRPC instead of HTTP for Dapr API calls offers lower latency, binary encoding, and streaming support - making it ideal for high-throughput microservices.

## Configuring the gRPC Port via Annotations

```yaml
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
        dapr.io/grpc-port: "50001"
        dapr.io/app-protocol: "grpc"
        dapr.io/app-port: "5001"
    spec:
      containers:
      - name: order-service
        image: order-service:latest
        ports:
        - containerPort: 5001
```

## Using gRPC API in Application Code

Connect to the Dapr sidecar gRPC port in your application:

```go
// Go example - connect to Dapr gRPC sidecar
package main

import (
    "context"
    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    // Connects to dapr sidecar on grpc port 50001 by default
    client, err := dapr.NewClient()
    if err != nil {
        panic(err)
    }
    defer client.Close()

    // Invoke a service via gRPC
    resp, err := client.InvokeMethod(
        context.Background(),
        "checkout",
        "placeOrder",
        "post",
    )
}
```

For Python:

```python
from dapr.clients import DaprClient

# Uses DAPR_GRPC_PORT env var (default: 50001)
with DaprClient() as client:
    result = client.invoke_method(
        app_id='checkout',
        method_name='placeOrder',
        data=b'{"orderId": "123"}',
        content_type='application/json'
    )
```

## Custom gRPC Port Configuration

Change the gRPC port when 50001 conflicts with another service:

```yaml
# Deployment annotation
dapr.io/grpc-port: "50051"
```

Update the application to use the custom port:

```yaml
# Set via environment variable
env:
  - name: DAPR_GRPC_PORT
    value: "50051"
```

```go
// Or explicitly in Go SDK
client, err := dapr.NewClientWithPort("50051")
```

## gRPC App Protocol

When your application also exposes a gRPC server for callbacks:

```yaml
# Tell Dapr your app speaks gRPC
dapr.io/app-protocol: "grpc"
dapr.io/app-port: "5001"
dapr.io/grpc-port: "50001"  # Dapr's own gRPC API port
```

Dapr will use gRPC to call your application for pub/sub subscriptions and service invocations:

```go
// Implement the Dapr gRPC app server
type server struct {}

func (s *server) OnInvoke(ctx context.Context, in *commonv1pb.InvokeRequest) (*commonv1pb.InvokeResponse, error) {
    // Handle incoming invocation via gRPC
    return &commonv1pb.InvokeResponse{
        Data: &anypb.Any{Value: []byte(`{"status": "ok"}`)},
    }, nil
}
```

## Verifying gRPC Connectivity

```bash
# Test Dapr gRPC port from within the pod
kubectl exec POD_NAME -c app -- \
  grpcurl -plaintext localhost:50001 \
  dapr.proto.runtime.v1.Dapr/GetState \
  -d '{"store_name": "statestore", "key": "order-1"}'

# Check gRPC port is listening
kubectl exec POD_NAME -c daprd -- ss -tlnp | grep 50001
```

## Summary

The Dapr gRPC port enables high-performance binary protocol communication between your application and the Dapr sidecar. By configuring the gRPC port explicitly and using the gRPC app protocol for bidirectional callbacks, you can reduce serialization overhead and achieve lower latency in high-throughput Dapr-based microservices.
