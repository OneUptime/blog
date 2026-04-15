# How to Use Custom Trace Headers in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Tracing, Custom Header, Baggage, Observability, Microservice

Description: Pass custom metadata across Dapr service boundaries using W3C Baggage headers and custom HTTP headers for enriched trace context propagation.

---

## Overview

While W3C Trace Context (`traceparent` and `tracestate`) handles trace correlation, sometimes you need to propagate additional context across services - such as user ID, tenant ID, request source, or feature flags. Dapr forwards HTTP headers during service invocation, letting you propagate custom context. The W3C Baggage standard provides a structured way to do this.

## W3C Baggage Standard

The `baggage` header carries key-value pairs that propagate across service boundaries:

```yaml
baggage: userId=user-42,tenantId=tenant-abc,featureFlag=new-checkout
```

Dapr passes through `baggage` headers automatically during service invocation.

## Injecting Baggage at the Entry Point

```python
from flask import Flask, request
import requests

app = Flask(__name__)

@app.route('/api/checkout', methods=['POST'])
def checkout():
    data = request.json

    # Build baggage from request context
    user_id = data.get('userId')
    tenant_id = request.headers.get('X-Tenant-Id', 'default')
    baggage = f"userId={user_id},tenantId={tenant_id}"

    # Forward to downstream service via Dapr
    resp = requests.post(
        "http://localhost:3500/v1.0/invoke/order-service/method/create",
        json=data,
        headers={
            "traceparent": request.headers.get("traceparent", ""),
            "baggage": baggage,
            "Content-Type": "application/json"
        }
    )
    return resp.json(), resp.status_code
```

## Reading Baggage in Downstream Services

```python
@app.route('/create', methods=['POST'])
def create_order():
    baggage_header = request.headers.get('baggage', '')
    baggage = parse_baggage(baggage_header)

    user_id = baggage.get('userId', 'unknown')
    tenant_id = baggage.get('tenantId', 'default')

    # Add to structured logs
    print(json.dumps({
        "event": "order_created",
        "user_id": user_id,
        "tenant_id": tenant_id,
        "trace_id": extract_trace_id(request)
    }))

    return '', 200

def parse_baggage(baggage_str):
    result = {}
    for item in baggage_str.split(','):
        parts = item.strip().split('=', 1)
        if len(parts) == 2:
            result[parts[0].strip()] = parts[1].strip()
    return result
```

## Custom Correlation Headers

Beyond baggage, you can propagate custom headers. Dapr passes through headers during service invocation:

```python
# Publishing with custom metadata
import requests

def publish_with_metadata(topic, data, user_id, request_id):
    requests.post(
        "http://localhost:3500/v1.0/publish/kafka-pubsub/" + topic,
        json=data,
        headers={
            "Content-Type": "application/json",
            "traceparent": current_traceparent(),
            "x-user-id": user_id,
            "x-request-id": request_id
        }
    )
```

Note: For pub/sub, custom HTTP headers like `x-user-id` are not automatically forwarded to subscribers. Only trace context headers (`traceparent`, `tracestate`) are propagated via the CloudEvent envelope. To pass custom metadata through pub/sub, include it in the message body.

## Using OpenTelemetry Baggage API

For proper OTel integration, use the Baggage API:

```python
from opentelemetry.baggage import set_baggage, get_baggage
from opentelemetry.context import attach, detach
from opentelemetry.propagate import inject, extract

@app.route('/api/orders', methods=['POST'])
def create_order():
    # Extract incoming context
    ctx = extract(request.headers)

    # Add baggage to context
    ctx = set_baggage("userId", request.json.get("userId"), context=ctx)
    ctx = set_baggage("tenantId", request.headers.get("X-Tenant-Id"), context=ctx)

    token = attach(ctx)
    try:
        # Inject all context (traceparent + baggage) into outgoing headers
        headers = {}
        inject(headers)

        resp = requests.post(
            "http://localhost:3500/v1.0/invoke/payment-service/method/charge",
            json=request.json,
            headers={**headers, "Content-Type": "application/json"}
        )
        return resp.json()
    finally:
        detach(token)
```

## Verifying Header Propagation

Test that headers flow through Dapr:

```bash
# Call service-a which calls service-b via Dapr
curl -X POST http://localhost:3500/v1.0/invoke/service-a/method/process \
  -H "baggage: userId=test-user,tenantId=test-tenant" \
  -H "Content-Type: application/json" \
  -d '{}'

# In service-b logs, you should see:
# {"event":"processing","user_id":"test-user","tenant_id":"test-tenant"}
```

## Security Considerations

Baggage is end-to-end and not validated by default. In production:
- Validate and sanitize baggage values at ingress
- Do not put sensitive data in baggage headers
- Consider encrypting sensitive correlation values
- Limit baggage size (W3C spec requires platforms to propagate at least 8192 bytes)

## Summary

Dapr forwards HTTP headers during service invocation, enabling propagation of W3C Baggage and custom correlation headers across service boundaries. Use the W3C Baggage header for structured key-value context like user ID and tenant ID. Add these values to structured logs alongside the trace ID to correlate all observability signals for a specific user or tenant across your entire Dapr microservice mesh.
