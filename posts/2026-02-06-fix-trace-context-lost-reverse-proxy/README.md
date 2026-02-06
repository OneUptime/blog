# How to Fix Trace Context Being Lost When Requests Pass Through a Reverse Proxy That Strips traceparent Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Trace Context, Reverse Proxy, Headers

Description: Fix broken distributed traces caused by reverse proxies or API gateways that strip the traceparent propagation header.

Your traces break at the edge of your system. The frontend service creates a trace, sends a request to the backend, but the backend starts a completely new trace. The connection between the two is lost. The culprit is usually a reverse proxy, API gateway, or load balancer sitting between the services that strips the `traceparent` header.

## Understanding the Problem

The W3C TraceContext standard uses two HTTP headers for propagation:

```
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

NGINX does not strip custom headers by default, but misconfiguration with `proxy_set_header` can cause issues:

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

        # Preserve all other headers
        proxy_pass_request_headers on;
    }
}
```

A common mistake is using `proxy_set_header Host $host;` without including other headers. When you set any `proxy_set_header`, NGINX only passes the headers you explicitly list plus a few defaults. Add trace headers to the list.

## Fix 2: Configure HAProxy

HAProxy needs explicit configuration to forward trace headers:

```
frontend http-in
    bind *:80
    default_backend servers

backend servers
    # HAProxy passes headers by default, but check for any
    # reqidel or reqdel rules that might strip them

    # Do NOT have rules like these:
    # reqidel ^traceparent:.*
    # reqidel ^X-B3-.*

    server backend1 10.0.0.1:8080 check
```

If you are using HAProxy's built-in tracing:

```
# Make sure the trace context is not consumed by HAProxy
# without being forwarded
defaults
    option forwardfor
    # Do not set 'option dontlognull' if it affects header forwarding
```

## Fix 3: Configure AWS ALB / API Gateway

AWS ALB passes headers through by default. But API Gateway may strip unknown headers depending on the integration type:

```yaml
# AWS API Gateway - HTTP API passes all headers by default
# REST API needs explicit header mapping

# In CloudFormation/Terraform for REST API:
resource "aws_api_gateway_method_response" "response" {
  response_parameters = {
    "method.response.header.traceparent" = true
    "method.response.header.tracestate"  = true
  }
}

resource "aws_api_gateway_integration_response" "response" {
  response_parameters = {
    "method.response.header.traceparent" = "integration.response.header.traceparent"
    "method.response.header.tracestate"  = "integration.response.header.tracestate"
  }
}
```

For CloudFront, add trace headers to the origin request policy:

```yaml
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
# Traefik passes headers by default, but verify with:
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: pass-trace-headers
spec:
  headers:
    customRequestHeaders:
      # Traefik should not need this, but if headers are being stripped:
      traceparent: ""  # Empty value means "pass through from client"
```

## Fix 5: Instrument the Proxy Itself

The best approach is to have the proxy participate in the trace rather than just passing headers through:

```nginx
# NGINX with OpenTelemetry module
load_module modules/ngx_http_opentelemetry_module.so;

http {
    opentelemetry_config /etc/nginx/otel-nginx.toml;

    server {
        location / {
            opentelemetry on;  # Creates a span for this location
            opentelemetry_propagate;  # Propagates context downstream
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
