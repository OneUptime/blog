# How to Fix Proxy Configuration Issues When the Collector Cannot Reach an OTLP Backend Behind a Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Proxy, Load Balancer, Collector

Description: Resolve proxy and load balancer configuration issues that prevent the Collector from exporting to OTLP backends.

When the OpenTelemetry Collector sits behind a corporate proxy or needs to reach a backend behind a load balancer, things can go wrong in subtle ways. The Collector might connect successfully but then get disconnected, or it might fail entirely because the proxy does not understand gRPC. This post covers the most common issues and their fixes.

## The Problem

Your Collector is deployed inside a corporate network. It needs to send telemetry to an external observability backend (like OneUptime, Jaeger, or any SaaS provider) that sits behind a load balancer. The network path looks something like:

```
Collector -> Corporate Proxy -> Internet -> Load Balancer -> Backend
```

Each hop can introduce problems.

## Issue 1: Proxy Does Not Support HTTP/2 (gRPC)

gRPC requires HTTP/2. Many corporate HTTP proxies only support HTTP/1.1. When the Collector tries to establish a gRPC connection through such a proxy, the connection fails or degrades.

```
rpc error: code = Internal desc = transport: received the unexpected content-type "text/html"
```

The fix is to switch the exporter to HTTP/protobuf, which works over HTTP/1.1:

```yaml
# collector-config.yaml
exporters:
  otlphttp:
    endpoint: "https://otlp.backend.example.com"
    # HTTP/protobuf works through HTTP/1.1 proxies
    headers:
      Authorization: "Bearer ${API_KEY}"
```

If you must use gRPC, configure the proxy to support CONNECT tunneling for HTTP/2:

```yaml
exporters:
  otlp:
    endpoint: "otlp.backend.example.com:4317"
    tls:
      insecure: false
    # Some proxies need the CONNECT method
    proxy_url: "http://corporate-proxy.internal:3128"
```

## Issue 2: Load Balancer Terminating gRPC Connections

Many Layer 4 load balancers (TCP-level) work fine with gRPC. But Layer 7 load balancers that do not understand gRPC will break the HTTP/2 framing.

Symptoms include:

```
rpc error: code = Unavailable desc = transport is closing
rpc error: code = Internal desc = unexpected HTTP status code received from server: 502
```

The fix depends on your load balancer:

For **AWS ALB**, enable gRPC target groups:

```yaml
# Terraform example for AWS ALB with gRPC
resource "aws_lb_target_group" "otel_grpc" {
  name        = "otel-grpc"
  port        = 4317
  protocol    = "HTTP"
  protocol_version = "gRPC"  # This is the key setting
  vpc_id      = var.vpc_id

  health_check {
    enabled             = true
    path                = "/grpc.health.v1.Health/Check"
    matcher             = "0"  # gRPC OK status
    protocol            = "HTTP"
  }
}
```

For **NGINX**, add gRPC-specific configuration:

```nginx
server {
    listen 4317 http2;

    location / {
        grpc_pass grpc://otel-backend:4317;
        grpc_set_header Host $host;

        # Increase timeouts for long-lived gRPC streams
        grpc_read_timeout 300s;
        grpc_send_timeout 300s;
    }
}
```

## Issue 3: Proxy Environment Variables Not Picked Up

The Collector reads standard proxy environment variables, but they need to be set correctly:

```yaml
# In the Collector Deployment
env:
  - name: HTTP_PROXY
    value: "http://proxy.internal:3128"
  - name: HTTPS_PROXY
    value: "http://proxy.internal:3128"
  - name: NO_PROXY
    value: "localhost,127.0.0.1,.cluster.local,10.0.0.0/8"
```

Make sure `NO_PROXY` includes your in-cluster services so that internal traffic does not route through the proxy.

## Issue 4: Load Balancer Idle Timeout

Load balancers have idle connection timeouts. If the Collector does not send data frequently enough, the connection gets dropped. AWS ALBs default to 60 seconds, for example.

```yaml
# Configure the Collector to send data more frequently
exporters:
  otlp:
    endpoint: "otlp.backend.example.com:4317"
    sending_queue:
      enabled: true
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
    # Enable keepalives to prevent idle timeout
    keepalive:
      time: 30s                    # Send keepalive ping every 30s
      timeout: 10s                 # Wait 10s for ping response
      permit_without_stream: true  # Send pings even without active RPCs
```

## Issue 5: Backend Returns 502 or 503

This often means the load balancer cannot reach the backend instances:

```bash
# Check from the Collector pod
kubectl exec -it otel-collector-pod -- curl -v https://otlp.backend.example.com/v1/traces \
  -H "Content-Type: application/x-protobuf" \
  --data-binary ""

# If you get a 502, the problem is between the LB and the backend
# If you get a connection timeout, the problem is between the Collector and the LB
```

## Testing the Full Path

```bash
# Test proxy connectivity
kubectl exec -it otel-collector-pod -- sh -c \
  "export HTTPS_PROXY=http://proxy.internal:3128 && \
   curl -v https://otlp.backend.example.com/v1/traces"

# Test without proxy to isolate the issue
kubectl exec -it otel-collector-pod -- sh -c \
  "unset HTTPS_PROXY && curl -v https://otlp.backend.example.com/v1/traces"
```

The key is to test each hop independently so you can pinpoint exactly where the connection fails. Once you know which component is causing the issue, the fix is usually straightforward.
