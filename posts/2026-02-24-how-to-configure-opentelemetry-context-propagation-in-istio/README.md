# How to Configure OpenTelemetry Context Propagation in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OpenTelemetry, Context Propagation, W3C Trace Context, B3, Distributed Tracing

Description: How to configure trace context propagation in Istio with OpenTelemetry, supporting W3C Trace Context, B3, and custom propagation formats.

---

Context propagation is the mechanism that ties distributed traces together. When a request moves from one service to another in an Istio mesh, trace context headers carry the trace ID, span ID, and sampling decision so that all services contribute spans to the same trace. Without proper propagation, you get disconnected trace fragments instead of a complete picture. Istio handles propagation at the proxy level, but your applications also play a critical role.

## How Context Propagation Works in Istio

When a request enters the mesh, the Envoy sidecar proxy checks for existing trace context headers. If headers are present (the request is part of an existing trace), the proxy uses them. If no headers are present (a new trace), the proxy generates new trace context.

The proxy then:
1. Creates its own span using the trace context
2. Passes the updated trace context headers to the application container
3. When the application makes outbound requests, the proxy on the outbound side ensures context is forwarded

Here is the important detail: the proxy handles context for the network hop between services. But within a service, if the application receives a request and then makes a call to another service, the application MUST forward the trace context headers. The proxy cannot do this automatically because it doesn't know which incoming request corresponds to which outgoing request.

## Supported Propagation Formats

Istio supports multiple trace context formats:

### W3C Trace Context (Default)

The W3C standard uses two headers:

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
tracestate: congo=ucfJifl5GOE,rojo=00f067aa0ba902b7
```

The `traceparent` header contains:
- Version: `00`
- Trace ID: `4bf92f3577b34da6a3ce929d0e0e4736` (32 hex chars)
- Parent Span ID: `00f067aa0ba902b7` (16 hex chars)
- Trace Flags: `01` (sampled)

The `tracestate` header carries vendor-specific data.

### B3 Multi-Header

The B3 format uses multiple headers:

```
x-b3-traceid: 4bf92f3577b34da6a3ce929d0e0e4736
x-b3-spanid: 00f067aa0ba902b7
x-b3-parentspanid: 463ac35c9f6413ad
x-b3-sampled: 1
```

### B3 Single Header

A compact single-header variant:

```
b3: 4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-1-463ac35c9f6413ad
```

## Configuring Propagation in Istio

Istio's default propagation includes both W3C Trace Context and B3 headers. You can verify by checking the headers on an incoming request:

```bash
# Deploy a debug service that echoes headers
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: header-echo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: header-echo
  template:
    metadata:
      labels:
        app: header-echo
    spec:
      containers:
      - name: echo
        image: hashicorp/http-echo:0.2.3
        args: ["-text=hello"]
        ports:
        - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: header-echo
spec:
  selector:
    app: header-echo
  ports:
  - port: 80
    targetPort: 5678
EOF
```

Send a request and check the trace headers that arrive:

```bash
kubectl exec $POD -c istio-proxy -- curl -v http://header-echo 2>&1 | grep -i "traceparent\|x-b3"
```

## Application-Level Header Forwarding

The most critical part of context propagation is what happens inside your application. When your service receives a request and makes calls to other services, it MUST forward the trace headers.

Here are the headers that must be propagated:

```
traceparent
tracestate
x-request-id
x-b3-traceid
x-b3-spanid
x-b3-parentspanid
x-b3-sampled
x-b3-flags
```

### Manual Forwarding (Simple Approach)

If you aren't using an OpenTelemetry SDK, manually copy headers:

**Python (Flask + requests):**

```python
from flask import Flask, request
import requests

app = Flask(__name__)

TRACE_HEADERS = [
    'traceparent', 'tracestate',
    'x-request-id',
    'x-b3-traceid', 'x-b3-spanid',
    'x-b3-parentspanid', 'x-b3-sampled', 'x-b3-flags',
]

def get_trace_headers():
    return {h: request.headers.get(h)
            for h in TRACE_HEADERS
            if request.headers.get(h)}

@app.route('/api/orders')
def list_orders():
    headers = get_trace_headers()
    # Forward headers to downstream calls
    inventory = requests.get('http://inventory-service/stock', headers=headers)
    pricing = requests.get('http://pricing-service/prices', headers=headers)
    return combine_results(inventory.json(), pricing.json())
```

**Go:**

```go
package main

import (
    "io"
    "net/http"
)

var traceHeaders = []string{
    "traceparent", "tracestate",
    "x-request-id",
    "x-b3-traceid", "x-b3-spanid",
    "x-b3-parentspanid", "x-b3-sampled", "x-b3-flags",
}

func forwardHeaders(incoming *http.Request, outgoing *http.Request) {
    for _, h := range traceHeaders {
        if v := incoming.Header.Get(h); v != "" {
            outgoing.Header.Set(h, v)
        }
    }
}

func orderHandler(w http.ResponseWriter, r *http.Request) {
    req, _ := http.NewRequest("GET", "http://inventory-service/stock", nil)
    forwardHeaders(r, req)
    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()
    io.Copy(w, resp.Body)
}
```

**Java (Spring Boot):**

```java
@RestController
public class OrderController {

    private static final String[] TRACE_HEADERS = {
        "traceparent", "tracestate",
        "x-request-id",
        "x-b3-traceid", "x-b3-spanid",
        "x-b3-parentspanid", "x-b3-sampled", "x-b3-flags"
    };

    @Autowired
    private RestTemplate restTemplate;

    @GetMapping("/api/orders")
    public ResponseEntity<String> getOrders(@RequestHeader HttpHeaders incomingHeaders) {
        HttpHeaders outgoingHeaders = new HttpHeaders();
        for (String header : TRACE_HEADERS) {
            String value = incomingHeaders.getFirst(header);
            if (value != null) {
                outgoingHeaders.set(header, value);
            }
        }

        HttpEntity<String> entity = new HttpEntity<>(outgoingHeaders);
        return restTemplate.exchange(
            "http://inventory-service/stock",
            HttpMethod.GET, entity, String.class
        );
    }
}
```

### Automatic Forwarding (OpenTelemetry SDK)

If you use the OpenTelemetry SDK with auto-instrumentation, context propagation happens automatically for supported libraries:

```python
# Python - auto-instrumentation handles propagation
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

# Now all Flask incoming requests have their context extracted
# and all outgoing requests.get() calls have context injected
```

## Configuring Propagator Priority

When multiple propagation formats are in use, configure which takes priority:

```python
from opentelemetry import propagate
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.trace.propagation import TraceContextTextMapPropagator
from opentelemetry.propagators.b3 import B3MultiFormat

# W3C Trace Context takes priority, B3 as fallback
propagate.set_global_textmap(CompositePropagator([
    TraceContextTextMapPropagator(),
    B3MultiFormat(),
]))
```

The composite propagator tries extractors in order and uses the first one that finds valid context.

## Handling Mixed Propagation

In a real mesh, you might have services using different propagation formats:
- Some services use W3C Trace Context (newer OpenTelemetry SDK)
- Some services use B3 (older Zipkin/Jaeger clients)
- Istio proxies support both

This works because:
1. The proxy always generates both formats
2. The composite propagator extracts whichever format is present
3. The SDK injects both formats into outgoing requests

Problems only occur when an application:
- Extracts context in one format (e.g., B3)
- Injects context in a different format (e.g., W3C only)
- The next service's proxy only looks for the format that wasn't injected

To prevent this, always configure your SDK to propagate both W3C and B3.

## Testing Context Propagation

Deploy a test application that logs trace context:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trace-debug
spec:
  replicas: 1
  selector:
    matchLabels:
      app: trace-debug
  template:
    metadata:
      labels:
        app: trace-debug
    spec:
      containers:
      - name: debug
        image: curlimages/curl:7.85.0
        command: ["sleep", "infinity"]
```

Send a request through the mesh and trace it:

```bash
DEBUG_POD=$(kubectl get pod -l app=trace-debug -o jsonpath='{.items[0].metadata.name}')

# Send a request and see the trace headers
kubectl exec $DEBUG_POD -- curl -sv http://my-service/api 2>&1 | grep -i "traceparent\|x-b3\|x-request-id"
```

## Debugging Broken Traces

When traces are disconnected:

1. **Check if headers arrive at the application:**

```bash
# Add a debug log to your app that prints incoming headers
kubectl logs $POD -c my-app | grep -i "traceparent\|x-b3"
```

2. **Check if headers are forwarded in outgoing requests:**

```bash
# Use tcpdump in the proxy to see outgoing headers
kubectl exec $POD -c istio-proxy -- pilot-agent request GET /config_dump | jq '.configs[].dynamic_active_clusters'
```

3. **Verify trace IDs match across services:**

```bash
# Get trace IDs from proxy access logs
kubectl logs $POD -c istio-proxy | grep "trace_id"
```

4. **Check for header stripping:** Some middleware or API gateways strip unknown headers. Make sure nothing in the request path removes trace headers.

## Baggage Propagation

OpenTelemetry Baggage lets you pass custom key-value pairs across service boundaries alongside trace context:

```python
from opentelemetry import baggage, context

# Set baggage
ctx = baggage.set_baggage("user.id", "12345")
ctx = baggage.set_baggage("tenant", "acme-corp", context=ctx)

# Make outgoing calls with this context
# Baggage is automatically propagated in the 'baggage' header
```

Baggage is useful for passing request-scoped data like user IDs, tenant IDs, or feature flags without modifying your API contracts. The data travels through the mesh via the `baggage` HTTP header.

Context propagation is the foundation that makes distributed tracing work. Get it right, and you have full visibility into every request across your mesh. Get it wrong, and you have disconnected fragments that are hard to make sense of. The good news is that with OpenTelemetry auto-instrumentation and Istio's built-in support for multiple formats, getting it right is mostly about making sure your application forwards the headers and uses a properly configured propagator.
