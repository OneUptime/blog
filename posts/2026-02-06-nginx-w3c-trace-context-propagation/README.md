# How to Configure NGINX W3C Trace Context Propagation with traceparent and tracestate Header Forwarding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, NGINX, W3C Trace Context, Header Propagation

Description: Configure NGINX to properly propagate W3C traceparent and tracestate headers to upstream services for end-to-end distributed tracing.

When NGINX sits between your clients and backend services, it must forward W3C Trace Context headers to maintain distributed trace continuity. Without proper header forwarding, traces break at the NGINX boundary and you lose visibility into the full request path. This post covers how to configure NGINX for proper trace context propagation.

## W3C Trace Context Headers

The W3C Trace Context specification defines two headers:

- **traceparent**: Contains the trace ID, parent span ID, and trace flags
- **tracestate**: Contains vendor-specific trace data

Format of `traceparent`:
```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

The `tracestate` header carries additional context:
```
tracestate: oneuptime=sampling:100,rojo=00f067aa0ba902b7
```

## Propagation with ngx_otel_module

If you have the OpenTelemetry module installed, propagation is handled automatically:

```nginx
load_module modules/ngx_otel_module.so;

http {
    otel_exporter {
        endpoint collector:4317;
    }

    otel_service_name "nginx";

    server {
        listen 80;

        otel_trace on;
        # This directive handles everything
        otel_trace_context propagate;

        location /api/ {
            proxy_pass http://backend:8080;
        }
    }
}
```

With `otel_trace_context propagate`, NGINX:
1. Reads the incoming `traceparent` header
2. Creates a child span
3. Forwards an updated `traceparent` with NGINX's span ID to the upstream
4. Passes through the `tracestate` header

## Manual Header Forwarding (Without the OTel Module)

If you cannot install the OpenTelemetry module, you can still forward trace context headers manually:

```nginx
http {
    server {
        listen 80;

        location /api/ {
            # Forward the traceparent header to the upstream
            proxy_set_header traceparent $http_traceparent;
            # Forward the tracestate header
            proxy_set_header tracestate $http_tracestate;
            # Also forward the baggage header
            proxy_set_header baggage $http_baggage;

            proxy_pass http://backend:8080;
        }
    }
}
```

This passes headers through without modification. NGINX does not create its own span in this case, but the trace remains intact between the client and the backend.

## Preserving Headers with proxy_pass_header

An alternative approach uses `proxy_pass_header`:

```nginx
location /api/ {
    proxy_pass_header traceparent;
    proxy_pass_header tracestate;
    proxy_pass_header baggage;
    proxy_pass http://backend:8080;
}
```

However, `proxy_set_header` is more explicit and recommended for trace context headers.

## Handling Multiple Upstreams

When NGINX routes to different backends, each upstream needs the headers:

```nginx
upstream user_backend {
    server user-svc-1:8080;
    server user-svc-2:8080;
}

upstream order_backend {
    server order-svc-1:8080;
    server order-svc-2:8080;
}

server {
    listen 80;

    # Define headers once in the server context
    proxy_set_header traceparent $http_traceparent;
    proxy_set_header tracestate $http_tracestate;
    proxy_set_header baggage $http_baggage;

    location /api/users/ {
        proxy_pass http://user_backend;
    }

    location /api/orders/ {
        proxy_pass http://order_backend;
    }
}
```

Setting the headers at the server level applies them to all locations, avoiding repetition.

## Adding Request ID Correlation

Combine trace context with NGINX's built-in request ID for additional correlation:

```nginx
server {
    listen 80;

    # Generate a unique request ID if not provided
    # This is separate from the trace ID but useful for log correlation
    proxy_set_header X-Request-ID $request_id;
    proxy_set_header traceparent $http_traceparent;
    proxy_set_header tracestate $http_tracestate;

    # Log both request ID and trace context
    log_format traced '$remote_addr - [$time_local] '
                      '"$request" $status '
                      'trace=$http_traceparent '
                      'reqid=$request_id';
    access_log /var/log/nginx/access.log traced;

    location / {
        proxy_pass http://backend:8080;
    }
}
```

## Testing Propagation

Use curl to send a request with trace headers and verify they reach the backend:

```bash
# Send a request with traceparent through NGINX
curl -v \
  -H "traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01" \
  -H "tracestate: oneuptime=test123" \
  -H "baggage: userId=alice,region=us-east" \
  http://localhost/api/test
```

On the backend, log the received headers to verify:

```python
# Simple echo server to verify headers
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/test')
def test():
    return jsonify({
        "traceparent": request.headers.get("traceparent"),
        "tracestate": request.headers.get("tracestate"),
        "baggage": request.headers.get("baggage"),
        "x-request-id": request.headers.get("x-request-id"),
    })
```

## Handling WebSocket Connections

WebSocket connections also need trace context for the initial handshake:

```nginx
location /ws/ {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    # Forward trace context for the WebSocket handshake
    proxy_set_header traceparent $http_traceparent;
    proxy_set_header tracestate $http_tracestate;
    proxy_pass http://ws-backend:8080;
}
```

The trace context applies to the handshake request. Individual WebSocket messages are not traced at the NGINX level.

## Common Pitfalls

1. **proxy_set_header inheritance**: If you set any `proxy_set_header` in a location block, the server-level settings are not inherited. Set all headers in the same block.

2. **Header case sensitivity**: HTTP/2 lowercases all headers. Make sure your backend handles lowercase `traceparent` instead of `Traceparent`.

3. **Buffering**: NGINX buffers responses by default. This does not affect trace propagation but can affect timing in traces.

## Summary

Proper W3C Trace Context propagation through NGINX is essential for end-to-end distributed tracing. Use the `ngx_otel_module` with `otel_trace_context propagate` for automatic handling, or manually forward `traceparent`, `tracestate`, and `baggage` headers with `proxy_set_header`. Set headers at the server level to apply them to all locations, and always test propagation with a header echo endpoint.
