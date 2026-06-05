# How to Fix Trace Context Being Lost When Requests Pass Through a Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Trace Context, Reverse Proxy, Header

Description: Fix broken distributed traces caused by reverse proxies or API gateways that strip the traceparent propagation header.

Your traces break at the edge of your system. The frontend service creates a trace, sends a request to the backend, but the backend starts a completely new trace. The connection between the two is lost. The culprit is usually a reverse proxy, API gateway, or load balancer sitting between the services that strips the `traceparent` header.

## Understanding the Problem

The W3C TraceContext standard uses two HTTP headers for propagation:

```text
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
tracestate: vendor1=value1,vendor2=value2
```

When a reverse proxy strips these headers (either intentionally for security or accidentally due to misconfiguration), the downstream service has no trace context to continue. It generates a new trace ID, creating a disconnected fragment.

## Diagnosing the Issue

```bash
# Check what headers arrive at the downstream service

# Add a debug endpoint or middleware that logs headers

# In the downstream service (Python/Flask example):
@app.before_request
def log_headers():
    trace_headers = {
        k: v for k, v in request.headers
        if k.lower() in ['traceparent', 'tracestate', 'x-b3-traceid', 'baggage']
    }
    print(f"Trace headers received: {trace_headers}")
    # If this is empty, the proxy is stripping headers
```

Test the proxy directly:

```bash
# Send a request with traceparent through the proxy
curl -v -H "traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01" \
  https://api.example.com/test

# Check if the header appears in the response or in downstream logs
```

## Fix 1: Configure NGINX to Pass Trace Headers

NGINX does not strip custom headers by default, but misconfiguration can cause issues. If an included proxy configuration disables request headers or rewrites trace headers to an empty value, pass them explicitly:

```nginx
server {
    listen 80;

    location / {
        proxy_pass http://backend:8080;

        # Explicitly pass trace context headers
        proxy_set_header traceparent $http_traceparent;
        proxy_set_header tracestate $http_tracestate;
        proxy_set_header baggage $http_baggage;

        # If you use B3 propagation
        proxy_set_header X-B3-TraceId $http_x_b3_traceid;
        proxy_set_header X-B3-SpanId $http_x_b3_spanid;
        proxy_set_header X-B3-Sampled $http_x_b3_sampled;

        # Keep forwarding request headers; this is the default
        proxy_pass_request_headers on;
    }
}
```

A common mistake is looking only at `proxy_set_header Host $host;`. That directive changes the upstream `Host` header, but it does not by itself remove unrelated request headers. Check for `proxy_pass_request_headers off;` or directives such as `proxy_set_header traceparent "";` that intentionally prevent a header from being passed.

## Fix 2: Configure HAProxy

HAProxy passes HTTP request headers by default. Check for rewrite rules that delete trace headers:

```text
frontend http-in
    bind *:80
    default_backend servers

backend servers
    # HAProxy passes headers by default, but check for any
    # http-request del-header rules that might strip them

    # Do NOT have rules like these:
    # http-request del-header traceparent
    # http-request del-header X-B3-TraceId

    server backend1 10.0.0.1:8080 check
```

If you are using HAProxy's tracing or header rewrite features, make sure they do not remove incoming trace context before the request reaches the backend. `option forwardfor` only manages `X-Forwarded-For`; it does not forward or preserve trace context headers:

```text
defaults
    option forwardfor
```

## Fix 3: Configure AWS ALB / API Gateway

AWS ALB passes valid request headers through to targets unless you configure header modification or invalid-header dropping behavior that affects them. API Gateway may require explicit request header mapping for REST APIs that use non-proxy integrations:

```hcl
# AWS API Gateway - HTTP API passes all headers by default
# REST API non-proxy integrations need explicit request header mapping

# In Terraform for REST API:
resource "aws_api_gateway_method" "method" {
  request_parameters = {
    "method.request.header.traceparent" = false
    "method.request.header.tracestate"  = false
  }
}

resource "aws_api_gateway_integration" "integration" {
  request_parameters = {
    "integration.request.header.traceparent" = "method.request.header.traceparent"
    "integration.request.header.tracestate"  = "method.request.header.tracestate"
  }
}
```

For CloudFront, add trace headers to the origin request policy:

```hcl
# CloudFront origin request policy
resource "aws_cloudfront_origin_request_policy" "trace" {
  name = "trace-headers"
  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["traceparent", "tracestate", "baggage"]
    }
  }
}
```

## Fix 4: Configure Kubernetes Ingress Controllers

For the NGINX Ingress Controller:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    # Enable OpenTelemetry tracing in the ingress controller
    nginx.ingress.kubernetes.io/enable-opentelemetry: "true"
    nginx.ingress.kubernetes.io/opentelemetry-trust-incoming-span: "true"
```

For Traefik:

```yaml
# Traefik passes request headers by default. Do not configure
# the Headers middleware to remove trace context headers:
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: strip-sensitive-headers
spec:
  headers:
    customRequestHeaders:
      X-Legacy-Trace-Header: ""  # Empty value removes this header
```

## Fix 5: Instrument the Proxy Itself

The best approach is to have the proxy participate in the trace rather than just passing headers through:

```nginx
# NGINX with OpenTelemetry module
load_module modules/ngx_otel_module.so;

http {
    otel_exporter {
        endpoint otel-collector:4317;
    }

    server {
        location / {
            otel_trace on;  # Creates a span for this location
            otel_trace_context propagate;  # Extracts incoming context and injects downstream context
            proxy_pass http://backend:8080;
        }
    }
}
```

This way, the proxy creates its own span as part of the trace, and context propagation is handled automatically.

## Verification

After configuring the proxy, verify end-to-end trace propagation:

```bash
# Send a traced request
curl -H "traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01" \
  http://your-proxy/api/test

# Check your tracing backend for trace ID 4bf92f3577b34da6a3ce929d0e0e4736
# All services should have spans under this trace ID
```

Reverse proxies are the most common place where trace context gets lost. Always test trace propagation through every network hop in your architecture, not just between application services.
