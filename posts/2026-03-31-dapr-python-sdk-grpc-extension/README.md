# How to Use Dapr Python SDK with gRPC Extension

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Python, gRPC, Microservice, Extension

Description: Learn how to build Dapr-enabled Python services using the gRPC extension for handling invocations, pub/sub events, and bindings with low latency.

---

## Introduction

The Dapr Python gRPC extension (`dapr-ext-grpc`) lets you build Python microservices that communicate with Dapr over gRPC instead of HTTP. This reduces serialization overhead and improves performance for latency-sensitive workloads. The extension provides a simple server class with decorators for registering invocation handlers and pub/sub subscriptions.

## Prerequisites

```bash
pip install dapr dapr-ext-grpc
dapr init
```

## Creating a gRPC Service

```python
# grpc_service.py
from dapr.ext.grpc import App, InvokeMethodRequest, InvokeMethodResponse
import json

app = App()
```

## Handling Service Invocations

Register a method handler using the `@app.method` decorator:

```python
@app.method(name="say-hello")
def say_hello(request: InvokeMethodRequest) -> InvokeMethodResponse:
    name = request.text()
    print(f"Invoked with: {name}")
    return InvokeMethodResponse(
        data=f"Hello, {name}!".encode("utf-8"),
        content_type="text/plain"
    )
```

## Subscribing to Pub/Sub Topics

```python
from dapr.ext.grpc import App
from cloudevents.sdk.event import v1

@app.subscribe(pubsub_name="pubsub", topic="alerts")
def handle_alert(event: v1.Event) -> None:
    data = json.loads(event.Data())
    print(f"Alert received: {data}")
```

## Handling Input Bindings

```python
@app.binding(name="cron-binding")
def handle_cron(request) -> None:
    print("Cron binding triggered")
    # Process scheduled work here
```

## Starting the gRPC Server

```python
if __name__ == "__main__":
    app.run(50051)
```

## Running with Dapr

```bash
dapr run \
  --app-id grpc-service \
  --app-port 50051 \
  --app-protocol grpc \
  -- python grpc_service.py
```

## Invoking the gRPC Service from Another App

```python
from dapr.clients import DaprClient

with DaprClient() as client:
    response = client.invoke_method(
        app_id="grpc-service",
        method_name="say-hello",
        data=b"World",
        content_type="text/plain"
    )
    print(response.text())
```

## Testing the Service

```bash
dapr invoke \
  --app-id grpc-service \
  --method say-hello \
  --data "World"
```

## Performance Considerations

For high-throughput services, gRPC offers several advantages over HTTP:
- Binary protobuf serialization reduces payload size
- Persistent connections reduce handshake overhead
- Bidirectional streaming is available for event-driven patterns

Configure the Dapr sidecar to use gRPC by setting `--app-protocol grpc` in your run command or the Kubernetes deployment annotation `dapr.io/app-protocol: grpc`.

## Summary

The Dapr Python gRPC extension provides a lightweight server that integrates with Dapr's sidecar via gRPC. Service invocation, pub/sub subscriptions, and input bindings are all supported with simple decorators. For performance-critical microservices, gRPC delivers lower latency than the HTTP-based approach.
