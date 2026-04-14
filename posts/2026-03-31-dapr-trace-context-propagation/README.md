# How to Use Trace Context Propagation in Dapr SDKs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Tracing, Observability, OpenTelemetry, Distributed Tracing

Description: Learn how to propagate trace context across Dapr services using the Dapr SDKs to achieve end-to-end distributed tracing visibility.

---

Distributed tracing becomes powerful only when trace context flows correctly across service boundaries. Dapr supports W3C TraceContext propagation out of the box, making it straightforward to correlate requests across microservices.

## How Dapr Propagates Trace Context

Dapr automatically injects and extracts W3C `traceparent` and `tracestate` headers when services communicate through the service invocation or pub/sub APIs. The sidecar handles propagation transparently, so you do not need to manually thread trace IDs through your application logic.

When your app calls another service via Dapr, the sidecar reads any incoming `traceparent` header, creates a child span, and forwards the updated header to the downstream service.

## Configuring the Zipkin Exporter

Enable tracing in your Dapr configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing-config
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin.monitoring:9411/api/v2/spans"
```

Apply it with:

```bash
kubectl apply -f tracing-config.yaml
```

## Propagating Context in the Go SDK

When using the Dapr Go SDK, you can pass a context that carries the trace information:

```go
package main

import (
    "context"
    dapr "github.com/dapr/go-sdk/client"
)

func invokeDownstream(ctx context.Context) {
    client, _ := dapr.NewClient()
    defer client.Close()

    // ctx already carries the traceparent from the inbound request
    resp, err := client.InvokeMethod(ctx, "order-service", "process", "post")
    if err != nil {
        panic(err)
    }
    _ = resp
}
```

Dapr's Go SDK uses the context directly. The sidecar extracts the W3C trace headers automatically.

## Propagating Context in the Python SDK

```python
from dapr.clients import DaprClient
from opentelemetry import trace
from opentelemetry.propagate import inject

def call_service(tracer, parent_ctx):
    with tracer.start_as_current_span("call-order-service", context=parent_ctx) as span:
        headers = {}
        inject(headers)  # inject traceparent into headers dict

        with DaprClient() as client:
            resp = client.invoke_method(
                app_id="order-service",
                method_name="process",
                data=b"{}",
                http_verb="POST",
                metadata=list(headers.items()),
            )
        return resp
```

## Verifying Propagation with curl

You can manually test propagation by including a `traceparent` header:

```bash
curl -H "traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01" \
     -H "Content-Type: application/json" \
     -d '{"orderId": "123"}' \
     http://localhost:3500/v1.0/invoke/order-service/method/process
```

Inspect the downstream service logs to confirm the same trace ID appears.

## Validating in Zipkin

Open the Zipkin UI and search for the trace ID from the `traceparent` header. You should see a trace timeline spanning all services involved in the request chain.

```bash
kubectl port-forward svc/zipkin 9411:9411 -n monitoring
```

Navigate to `http://localhost:9411` and search for your trace ID.

## Summary

Dapr handles W3C trace context propagation automatically through its sidecar, making distributed tracing simple across polyglot services. By configuring a tracing exporter and using the Dapr SDK, you get end-to-end visibility with minimal code changes. Verify propagation by checking trace IDs in your tracing backend such as Zipkin or Jaeger.
