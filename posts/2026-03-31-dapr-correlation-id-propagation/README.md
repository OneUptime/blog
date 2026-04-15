# How to Implement Correlation ID Propagation in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Tracing, Correlation, Observability, Distributed System

Description: Implement correlation ID propagation across Dapr microservices using W3C traceparent headers, middleware, and OpenTelemetry to trace requests end-to-end.

---

## Understanding Correlation IDs in Dapr

Dapr uses the W3C Trace Context standard (`traceparent` and `tracestate` headers) for distributed tracing. When a request enters your system, Dapr generates a trace ID that follows the request through every service invocation and pub/sub event. Understanding how to read, propagate, and log this ID is essential for debugging distributed systems.

```bash
# Enable tracing in Dapr configuration
kubectl apply -f - <<EOF
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing-config
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin:9411/api/v2/spans
EOF
```

## The W3C traceparent Format

The `traceparent` header format is: `{version}-{traceId}-{parentSpanId}-{traceFlags}`

- `version`: Always `00`
- `traceId`: 16-byte trace identifier (32 hex chars) - unique per request chain
- `parentSpanId`: 8-byte span identifier (16 hex chars)
- `traceFlags`: `01` = sampled, `00` = not sampled

```bash
# Example traceparent header
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
#              version-traceId(32)-parentSpanId(16)-flags
```

## Propagating Correlation ID in Node.js

```javascript
// correlation-middleware.js
const { AsyncLocalStorage } = require('async_hooks');
const correlationStore = new AsyncLocalStorage();

function correlationMiddleware(req, res, next) {
  const traceParent = req.headers['traceparent'] || '';
  const traceId = extractTraceId(traceParent) || generateTraceId();
  const requestId = req.headers['x-request-id'] || traceId;

  // Store in async context
  correlationStore.run({ traceId, requestId, traceParent }, () => {
    // Add to response headers for downstream visibility
    res.setHeader('x-trace-id', traceId);
    res.setHeader('x-request-id', requestId);
    next();
  });
}

function getCorrelationContext() {
  return correlationStore.getStore() || {};
}

function extractTraceId(traceParent) {
  const parts = (traceParent || '').split('-');
  return parts.length >= 2 ? parts[1] : null;
}

function generateTraceId() {
  return require('crypto').randomBytes(16).toString('hex');
}

module.exports = { correlationMiddleware, getCorrelationContext };
```

## Propagating to Dapr Service Calls

```javascript
// service-client.js
const { DaprClient, HttpMethod } = require('@dapr/dapr');
const { getCorrelationContext } = require('./correlation-middleware');

const daprClient = new DaprClient();

async function invokeWithCorrelation(appId, method, data) {
  const { traceParent, requestId } = getCorrelationContext();

  // Dapr automatically propagates traceparent via its sidecar
  // but you can also pass custom headers via metadata
  const result = await daprClient.invoker.invoke(
    appId,
    method,
    HttpMethod.POST,
    data,
    {
      headers: {
        'x-request-id': requestId,
        'traceparent': traceParent
      }
    }
  );

  return result;
}
```

## Python Correlation ID Propagation

```python
# correlation.py
import uuid
import contextvars
from fastapi import FastAPI, Request
from dapr.clients import DaprClient

correlation_ctx: contextvars.ContextVar[dict] = contextvars.ContextVar(
    'correlation', default={}
)

app = FastAPI()

@app.middleware("http")
async def correlation_middleware(request: Request, call_next):
    trace_parent = request.headers.get("traceparent", "")
    trace_id = parse_trace_id(trace_parent) or str(uuid.uuid4()).replace("-", "")
    request_id = request.headers.get("x-request-id", trace_id)

    token = correlation_ctx.set({
        "trace_id": trace_id,
        "request_id": request_id,
        "trace_parent": trace_parent
    })

    try:
        response = await call_next(request)
        response.headers["x-trace-id"] = trace_id
        return response
    finally:
        correlation_ctx.reset(token)

def parse_trace_id(trace_parent: str) -> str:
    parts = trace_parent.split("-")
    return parts[1] if len(parts) >= 2 else ""

def get_correlation() -> dict:
    return correlation_ctx.get({})
```

## Dapr Pub/Sub Correlation Forwarding

```yaml
# Dapr automatically includes traceparent in CloudEvents envelopes
# The data envelope looks like:
# {
#   "specversion": "1.0",
#   "type": "com.example.order",
#   "id": "event-id",
#   "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
#   "tracestate": "",
#   "data": { ... }
# }
```

## Summary

Dapr automatically propagates W3C `traceparent` headers through service invocations and pub/sub events, making correlation ID propagation largely automatic. The key implementation work is extracting the trace ID at your service entry points, storing it in async-local context, and including it in all log statements. This creates a complete trace from an external request through every Dapr building block interaction in your system.
