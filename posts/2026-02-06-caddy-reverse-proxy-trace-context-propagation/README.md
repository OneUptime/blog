# How to Configure Caddy as a Reverse Proxy with W3C Trace Context and Baggage Header Propagation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Caddy, Trace Context, Header Propagation

Description: Configure Caddy as a reverse proxy that correctly propagates W3C traceparent and baggage headers to upstream services for distributed tracing.

When Caddy sits between your clients and backend services, it needs to propagate tracing headers so that spans from different services connect into a single trace. The W3C Trace Context standard defines the `traceparent` and `tracestate` headers, while W3C Baggage defines the `baggage` header. Caddy, with its tracing directive enabled, handles this propagation automatically.

## How W3C Trace Context Works

The `traceparent` header carries the trace ID, parent span ID, and sampling flag:

```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
             |  |                                |                |
             v  v                                v                v
          version  trace-id                   parent-id     flags(sampled)
```

The `tracestate` header carries vendor-specific data:
```
tracestate: vendor1=value1,vendor2=value2
```

The `baggage` header carries application-defined key-value pairs:
```
baggage: userId=alice,requestPriority=high
```

## Caddy Trace Context Propagation

When you enable the `tracing` directive, Caddy automatically:

1. Reads the incoming `traceparent` header from the client
2. Creates a child span linked to the parent trace
3. Forwards updated `traceparent`, `tracestate`, and `baggage` headers to the upstream

```
# Caddyfile
{
    tracing {
        span "caddy-proxy"
    }
}

:80 {
    tracing
    reverse_proxy backend:8080
}
```

With this configuration, a request flowing through Caddy looks like:

```
Client                   Caddy                    Backend
  |                        |                         |
  |-- traceparent: A-B --> |                         |
  |                        |-- traceparent: A-C --> |
  |                        |   (new span ID C,      |
  |                        |    same trace ID A)     |
  |                        |                         |
```

## Preserving Baggage Headers

Caddy preserves the `baggage` header when proxying requests. This is important for passing application context like user IDs or feature flags through the entire request chain:

```python
# Client code that sets baggage
import requests

headers = {
    "traceparent": "00-abc123-def456-01",
    "baggage": "userId=alice,region=us-east-1,featureFlag=new-ui"
}

response = requests.get("http://caddy-proxy:80/api/data", headers=headers)
```

The backend receives both the updated `traceparent` (with Caddy's span ID) and the original `baggage` header intact.

## Multi-Upstream Configuration

When Caddy proxies to multiple backends, each upstream gets its own child span:

```
# Caddyfile
{
    tracing {
        span "caddy-api-gateway"
    }
}

:80 {
    tracing

    # Route to different backends based on path
    handle /api/users/* {
        reverse_proxy user-service:8080
    }

    handle /api/orders/* {
        reverse_proxy order-service:8081
    }

    handle /api/products/* {
        reverse_proxy product-service:8082
    }
}
```

Each `reverse_proxy` directive creates a new child span with the correct `traceparent` header forwarded to the respective backend.

## Testing Header Propagation

Create a simple backend that echoes received headers:

```python
# echo_server.py
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/test')
def test():
    # Return all tracing-related headers the server received
    trace_headers = {
        "traceparent": request.headers.get("traceparent", "not present"),
        "tracestate": request.headers.get("tracestate", "not present"),
        "baggage": request.headers.get("baggage", "not present"),
    }
    return jsonify(trace_headers)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

Send a request through Caddy:

```bash
curl -H "traceparent: 00-abcdef1234567890abcdef1234567890-1234567890abcdef-01" \
     -H "baggage: userId=test,env=dev" \
     http://localhost:80/api/test
```

The response should show the `traceparent` with the same trace ID but a new parent span ID (Caddy's span), and the `baggage` header passed through unchanged.

## Handling CORS with Trace Headers

If your frontend sends tracing headers from the browser, configure CORS in Caddy to allow them:

```
:80 {
    tracing

    header Access-Control-Allow-Headers "traceparent, tracestate, baggage, Content-Type"
    header Access-Control-Allow-Origin "*"

    @options method OPTIONS
    handle @options {
        respond 204
    }

    reverse_proxy backend:8080
}
```

Without this, browsers will strip the tracing headers in preflight checks.

## Combining with TLS Termination

Caddy often handles TLS termination. Tracing works with both HTTP and HTTPS:

```
example.com {
    tracing

    # Caddy auto-manages TLS
    reverse_proxy backend:8080

    # Add upstream scheme info to traces
    header_up X-Forwarded-Proto {http.request.scheme}
}
```

The trace span will show `http.scheme: https` for the client-facing connection.

## Verifying End-to-End Traces

After setting everything up, verify the trace chain in your tracing backend. You should see:

```
[Trace ID: abc123...]
  |-- Client request (if instrumented)
      |-- Caddy proxy span (caddy-proxy)
          |-- Backend service span (user-service)
              |-- Database query span
```

All spans share the same trace ID, confirming that context propagation works correctly through Caddy.

## Summary

Caddy's tracing directive automatically handles W3C Trace Context propagation. When Caddy receives a request with a `traceparent` header, it creates a child span and forwards the updated header to the upstream service. Baggage headers pass through unchanged. This makes Caddy a good choice for reverse proxy setups where end-to-end distributed tracing is needed. Make sure to configure CORS headers if browser-based clients are sending tracing headers.
