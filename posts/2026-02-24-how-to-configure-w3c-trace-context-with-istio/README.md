# How to Configure W3C Trace Context with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, W3C Trace Context, Tracing, OpenTelemetry, Standard

Description: How to configure Istio to use the W3C Trace Context standard for distributed tracing, including header format, propagation, and migration from B3.

---

W3C Trace Context is an official web standard (W3C Recommendation) for propagating trace context across service boundaries. Unlike the B3 format that Zipkin introduced (and that Istio has used by default for years), W3C Trace Context is a vendor-neutral standard that all major tracing tools and cloud providers support. If you're building a system that needs to interoperate with external services, cloud-native tools, or the broader OpenTelemetry ecosystem, W3C Trace Context is the right choice.

## W3C Trace Context Header Format

The standard defines two headers:

### traceparent

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
              |   |                                |                |
              v   v                                v                v
           version  trace-id (32 hex chars)    parent-id (16 hex)  flags
```

- **version:** Always `00` in the current spec
- **trace-id:** 128-bit identifier for the entire trace (32 hex characters)
- **parent-id:** 64-bit identifier for the parent span (16 hex characters)
- **flags:** 8-bit field, where `01` means "sampled" and `00` means "not sampled"

### tracestate

```
tracestate: vendor1=opaque-value,vendor2=another-value
```

The `tracestate` header carries vendor-specific data. For example, AWS X-Ray or Datadog might include their own correlation IDs here. Multiple vendors can coexist in a single tracestate header, separated by commas.

## Enabling W3C Trace Context in Istio

W3C Trace Context is automatically used when you configure the OpenTelemetry extension provider:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    extensionProviders:
      - name: otel
        opentelemetry:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
```

Activate it:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: w3c-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 10
```

When using the OpenTelemetry provider, Envoy generates `traceparent` and `tracestate` headers instead of B3 headers.

## Verifying W3C Headers

Check that Envoy is generating W3C headers:

```bash
# Send a request through the mesh and examine headers
kubectl exec deploy/sleep -- curl -s http://httpbin:8000/headers | python3 -m json.tool
```

You should see `traceparent` in the response headers:

```json
{
  "headers": {
    "Host": "httpbin:8000",
    "Traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    "Tracestate": "",
    "X-Request-Id": "d4e5f6a7-..."
  }
}
```

If you see `X-B3-Traceid` instead of `Traceparent`, you're still using a Zipkin-based provider.

## Propagating W3C Headers in Application Code

Your applications need to forward the `traceparent` and `tracestate` headers from incoming requests to outgoing requests.

### Python

```python
from flask import Flask, request
import requests as http_client

app = Flask(__name__)

W3C_HEADERS = ['traceparent', 'tracestate']
# Also propagate x-request-id for Envoy correlation
ALL_TRACE_HEADERS = W3C_HEADERS + ['x-request-id']

@app.before_request
def extract_trace_context():
    request.trace_ctx = {}
    for h in ALL_TRACE_HEADERS:
        val = request.headers.get(h)
        if val:
            request.trace_ctx[h] = val

@app.route('/api/orders')
def get_orders():
    resp = http_client.get(
        'http://inventory-service/api/stock',
        headers=request.trace_ctx
    )
    return resp.json()
```

### Go

```go
package main

import (
    "context"
    "net/http"
)

var w3cHeaders = []string{"traceparent", "tracestate", "x-request-id"}

type traceContextKey struct{}

func traceMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        headers := make(map[string]string)
        for _, h := range w3cHeaders {
            if val := r.Header.Get(h); val != "" {
                headers[h] = val
            }
        }
        ctx := context.WithValue(r.Context(), traceContextKey{}, headers)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func makeRequest(ctx context.Context, method, url string) (*http.Response, error) {
    req, err := http.NewRequestWithContext(ctx, method, url, nil)
    if err != nil {
        return nil, err
    }

    if headers, ok := ctx.Value(traceContextKey{}).(map[string]string); ok {
        for k, v := range headers {
            req.Header.Set(k, v)
        }
    }

    return http.DefaultClient.Do(req)
}
```

### Node.js

```javascript
const express = require('express');
const axios = require('axios');

const app = express();
const W3C_HEADERS = ['traceparent', 'tracestate', 'x-request-id'];

app.use((req, res, next) => {
  req.traceCtx = {};
  for (const h of W3C_HEADERS) {
    if (req.headers[h]) {
      req.traceCtx[h] = req.headers[h];
    }
  }
  next();
});

app.get('/api/data', async (req, res) => {
  const response = await axios.get('http://backend-service/api/internal', {
    headers: req.traceCtx
  });
  res.json(response.data);
});
```

### Using OpenTelemetry SDK for Automatic Propagation

Instead of manual propagation, the OpenTelemetry SDK handles W3C Trace Context automatically:

```python
# Python with OpenTelemetry auto-instrumentation
pip install opentelemetry-instrumentation-flask opentelemetry-instrumentation-requests

from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.composite import CompositeHTTPPropagator
from opentelemetry.trace.propagation import TraceContextTextMapPropagator

# Set W3C Trace Context as the propagator
set_global_textmap(CompositeHTTPPropagator([
    TraceContextTextMapPropagator()
]))

FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()
```

With auto-instrumentation, you don't need to manually extract or inject headers.

## Migrating from B3 to W3C Trace Context

If you're currently using B3 headers and want to switch to W3C, here's a safe migration path:

### Phase 1: Dual Propagation

Update your applications to propagate both B3 and W3C headers:

```python
ALL_TRACE_HEADERS = [
    # W3C
    'traceparent', 'tracestate',
    # B3 multi-header
    'x-b3-traceid', 'x-b3-spanid', 'x-b3-parentspanid',
    'x-b3-sampled', 'x-b3-flags',
    # B3 single-header
    'b3',
    # Envoy
    'x-request-id',
]
```

Deploy this across all services while still using the Zipkin provider.

### Phase 2: Switch the Provider

Once all services propagate both formats, switch Istio from Zipkin to OpenTelemetry:

```yaml
# Before
extensionProviders:
  - name: tracing
    zipkin:
      service: zipkin.observability.svc.cluster.local
      port: 9411

# After
extensionProviders:
  - name: tracing
    opentelemetry:
      service: otel-collector.observability.svc.cluster.local
      port: 4317
```

Update the Telemetry resource to reference the new provider and restart workloads.

### Phase 3: Verify

Check that traces are complete:

```bash
# Generate traffic
kubectl exec deploy/sleep -- curl -s http://my-service:8080/api/test

# Check for W3C headers
kubectl exec deploy/sleep -- curl -s http://httpbin:8000/headers | grep -i traceparent

# Verify traces in the backend
kubectl port-forward svc/jaeger-query -n observability 16686:16686
```

### Phase 4: Clean Up

Once you've confirmed everything works with W3C, you can optionally remove B3 header propagation from your application code. But keeping both doesn't hurt and provides backward compatibility.

## W3C Trace Context with External Services

When your mesh communicates with external services that support W3C Trace Context, traces can span across organizational boundaries:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: partner-api
spec:
  hosts:
    - api.partner.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
```

When your service calls `api.partner.com` through the mesh, Envoy adds the `traceparent` header. If the partner's service also supports W3C Trace Context, they can continue the trace on their end, creating a cross-organization trace.

## Parsing traceparent Programmatically

If you need to extract information from the `traceparent` header:

```python
def parse_traceparent(header):
    parts = header.split('-')
    if len(parts) != 4:
        return None
    return {
        'version': parts[0],
        'trace_id': parts[1],
        'parent_id': parts[2],
        'flags': parts[3],
        'sampled': int(parts[3], 16) & 0x01 == 1,
    }

# Example
tp = parse_traceparent("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01")
# {
#   'version': '00',
#   'trace_id': '4bf92f3577b34da6a3ce929d0e0e4736',
#   'parent_id': '00f067aa0ba902b7',
#   'flags': '01',
#   'sampled': True
# }
```

## Using tracestate for Vendor-Specific Data

The `tracestate` header carries vendor-specific context. If you need to include custom data:

```python
# Reading tracestate
def parse_tracestate(header):
    entries = {}
    for pair in header.split(','):
        pair = pair.strip()
        if '=' in pair:
            key, value = pair.split('=', 1)
            entries[key.strip()] = value.strip()
    return entries

# Writing tracestate
def build_tracestate(entries):
    return ','.join(f'{k}={v}' for k, v in entries.items())
```

Common tracestate entries:
- `dd=...` - Datadog trace context
- `sw=...` - SkyWalking context
- `ot=...` - OpenTelemetry vendor-specific data

## Advantages of W3C Over B3

| Feature | B3 | W3C Trace Context |
|---------|----|--------------------|
| Standard | Community (Zipkin) | W3C Recommendation |
| Headers | 5 separate headers (or 1 compact) | 2 headers |
| Vendor data | Not supported | tracestate header |
| Browser support | Limited | Supported by fetch API |
| Cloud provider support | Some | All major providers |
| Trace ID length | 64 or 128 bit | Always 128 bit |

## Troubleshooting

If traces break after switching to W3C:

```bash
# Check which headers are present
kubectl exec deploy/sleep -- curl -v http://httpbin:8000/get 2>&1 | grep -i "traceparent\|x-b3"

# Verify the provider type
kubectl get configmap istio -n istio-system -o yaml | grep -A5 extensionProviders

# Check Envoy bootstrap
istioctl proxy-config bootstrap deploy/my-service -o json | grep -A10 "propagation\|trace"
```

If `traceparent` is present but traces are disconnected, your application is likely not propagating the header. Add logging to confirm:

```python
@app.before_request
def log_trace_context():
    tp = request.headers.get('traceparent', 'missing')
    app.logger.info(f"Incoming traceparent: {tp}")
```

## Summary

W3C Trace Context is the standard for distributed trace propagation, and Istio supports it through the OpenTelemetry extension provider. The migration from B3 is straightforward - propagate both formats during the transition, switch the provider, verify, and optionally clean up. W3C gives you vendor neutrality, cross-organization trace compatibility, and alignment with the broader OpenTelemetry ecosystem. For new deployments, start with W3C from the beginning.
