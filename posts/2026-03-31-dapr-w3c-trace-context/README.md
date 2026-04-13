# How to Use W3C Trace Context with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, W3C Trace Context, Distributed Tracing, OpenTelemetry, Observability, Microservice

Description: Understand how Dapr implements W3C Trace Context for cross-service trace propagation and how to work with trace headers in your applications.

---

## Overview

W3C Trace Context is an industry standard (W3C Recommendation) that defines how trace information is propagated in HTTP headers across service boundaries. Dapr implements W3C Trace Context natively, automatically injecting and reading `traceparent` and `tracestate` headers. Understanding this standard lets you correlate traces across Dapr services and non-Dapr services in the same system.

## W3C Trace Context Headers

Two headers define the standard:

### traceparent

Format: `{version}-{trace-id}-{parent-id}-{trace-flags}`

```yaml
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

- `00`: Version (always 00)
- `4bf92f3577b34da6a3ce929d0e0e4736`: 128-bit trace ID (shared across all spans)
- `00f067aa0ba902b7`: 64-bit parent span ID
- `01`: Flags (01 = sampled)

### tracestate

Optional vendor-specific data:

```yaml
tracestate: dapr=00f067aa0ba902b7
```

## How Dapr Propagates Trace Context

Dapr automatically:
1. Reads `traceparent` from incoming requests
2. Creates a child span with a new parent ID
3. Injects updated `traceparent` when calling downstream Dapr services
4. Exports spans to the configured tracing backend

## Reading Trace Headers in Your App

```python
from flask import Flask, request

app = Flask(__name__)

@app.route('/process', methods=['POST'])
def process():
    # Access trace headers passed through by Dapr
    traceparent = request.headers.get('traceparent')
    tracestate = request.headers.get('tracestate')

    print(f"Trace ID from traceparent: {extract_trace_id(traceparent)}")

    # Your app logic here
    return '', 200

def extract_trace_id(traceparent):
    if traceparent:
        parts = traceparent.split('-')
        return parts[1] if len(parts) >= 2 else None
    return None
```

## Propagating Trace Context to Non-Dapr Services

When your Dapr app calls an external HTTP service, forward the trace headers:

```python
import requests

@app.route('/checkout', methods=['POST'])
def checkout():
    # Get trace headers from incoming request
    traceparent = request.headers.get('traceparent', '')
    tracestate = request.headers.get('tracestate', '')

    # Forward to external payment service
    response = requests.post(
        'https://payment.external.com/charge',
        json=request.json,
        headers={
            'traceparent': traceparent,
            'tracestate': tracestate,
            'Content-Type': 'application/json'
        }
    )
    return response.json(), response.status_code
```

## Injecting Trace Context in Dapr Service Invocation

When invoking another Dapr service, include trace headers:

```bash
curl -X POST http://localhost:3500/v1.0/invoke/payment-service/method/charge \
  -H "Content-Type: application/json" \
  -H "traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01" \
  -d '{"amount": 99.99}'
```

Dapr reads the `traceparent` header and continues the trace, creating a child span under the same trace ID.

## Generating a Root Span

For entry-point services (API gateways, HTTP handlers), generate a new trace ID:

```python
import os

def generate_traceparent():
    trace_id = os.urandom(16).hex()
    span_id = os.urandom(8).hex()
    return f"00-{trace_id}-{span_id}-01"

@app.route('/api/orders', methods=['POST'])
def create_order():
    # Create root span if no incoming trace context
    if 'traceparent' not in request.headers:
        traceparent = generate_traceparent()
    else:
        traceparent = request.headers['traceparent']

    # Pass to Dapr service invocation
    response = requests.post(
        'http://localhost:3500/v1.0/invoke/order-service/method/create',
        json=request.json,
        headers={'traceparent': traceparent}
    )
    return response.json()
```

## Verifying Trace Propagation

```bash
# Generate a traceparent header and extract the trace ID
TRACEPARENT="00-$(openssl rand -hex 16)-$(openssl rand -hex 8)-01"
TRACE_ID=$(echo "$TRACEPARENT" | cut -d'-' -f2)

# Make a request with the generated traceparent
curl -s -X POST http://localhost:3500/v1.0/invoke/service-b/method/process \
  -H "Content-Type: application/json" \
  -H "traceparent: $TRACEPARENT" \
  -d '{}'

# Look up the trace in Zipkin by trace ID
curl "http://localhost:9411/api/v2/trace/$TRACE_ID"
```

## Summary

W3C Trace Context is the backbone of distributed tracing in Dapr. Dapr automatically reads and propagates `traceparent` headers across service invocations, creating a linked chain of spans under the same trace ID. Forward these headers to non-Dapr services to extend trace visibility beyond the Dapr boundary, and use the trace ID from `traceparent` to correlate logs with traces for complete observability.
