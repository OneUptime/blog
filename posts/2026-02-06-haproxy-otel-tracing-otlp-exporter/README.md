# How to Configure HAProxy OpenTelemetry Tracing with the OpenTracing Filter and OTLP Exporter Bridge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, HAProxy, Tracing, OpenTracing Bridge

Description: Configure HAProxy to export distributed traces using the OpenTracing filter with an OTLP exporter bridge for OpenTelemetry integration.

HAProxy supports distributed tracing through its OpenTracing filter. While HAProxy uses the OpenTracing API natively, you can bridge this to OpenTelemetry using the OpenTracing compatibility shim. This post covers how to set up HAProxy tracing with OTLP export.

## How HAProxy Tracing Works

HAProxy includes a built-in OpenTracing filter that hooks into request processing. When enabled, it creates spans for frontend connections, backend selection, and server responses. The filter communicates with a tracing plugin loaded as a shared library.

## Installing the Tracing Plugin

HAProxy uses the SPOE (Stream Processing Offload Engine) or a shared library for tracing. The recommended approach is using the OTel-compatible tracer:

```bash
# Build the OpenTelemetry tracer plugin for HAProxy
git clone https://github.com/haproxytech/opentracing-c-wrapper.git
cd opentracing-c-wrapper
mkdir build && cd build
cmake ..
make
sudo make install
```

## HAProxy Configuration

Configure HAProxy with the OpenTracing filter:

```
# haproxy.cfg
global
    log stdout format raw local0 info

    # Load the OpenTracing filter
    module-path /usr/lib/haproxy
    module-load opentracing.so

defaults
    mode http
    log global
    option httplog
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend http_front
    bind *:80

    # Enable OpenTracing on this frontend
    filter opentracing id ot-front config /etc/haproxy/otel-tracer.json

    # Inject trace headers into requests going to backends
    http-request set-header traceparent %[var(txn.ot.traceparent)]

    default_backend servers

backend servers
    balance roundrobin

    # Enable OpenTracing on this backend
    filter opentracing id ot-back config /etc/haproxy/otel-tracer.json

    server s1 backend1:8080 check
    server s2 backend2:8080 check
```

## Tracer Configuration

Create the tracer configuration file that points to your Collector:

```json
{
  "service_name": "haproxy",
  "disabled": false,
  "propagation_format": "w3c",
  "reporter": {
    "endpoint": "http://otel-collector:4318/v1/traces",
    "log_spans": true
  },
  "sampler": {
    "type": "const",
    "param": 1
  },
  "tags": {
    "haproxy.version": "2.9",
    "deployment.environment": "production"
  }
}
```

## Using the SPOE Approach

An alternative is using HAProxy's SPOE to send trace data to an agent process:

```
# haproxy.cfg - SPOE-based tracing
global
    log stdout format raw local0

frontend http_front
    bind *:80

    # Use SPOE for tracing
    filter spoe engine otel-tracing config /etc/haproxy/otel-spoe.conf

    default_backend servers

backend servers
    server s1 backend1:8080 check
```

The SPOE configuration:

```
# /etc/haproxy/otel-spoe.conf
[otel-tracing]
spoe-agent otel-agent
    messages on-frontend-request on-backend-response
    option var-prefix otel
    timeout hello      100ms
    timeout idle       30s
    timeout processing 15ms
    use-backend otel-agent-backend

spoe-message on-frontend-request
    args method=method path=path src=src
    event on-frontend-http-request

spoe-message on-backend-response
    args status=status
    event on-http-response
```

## Collector Configuration

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
  resource:
    attributes:
      - key: service.type
        value: load-balancer
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp]
```

## Docker Compose Setup

```yaml
version: "3.8"

services:
  haproxy:
    image: haproxy:latest
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg
      - ./otel-tracer.json:/etc/haproxy/otel-tracer.json
    ports:
      - "80:80"
      - "8404:8404"
    depends_on:
      - otel-collector

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"

  backend1:
    image: myorg/backend:latest
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=backend

  backend2:
    image: myorg/backend:latest
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=backend
```

## Trace Context Propagation

HAProxy can propagate W3C trace context headers to backends. Configure the propagation format in the tracer config:

```json
{
  "propagation_format": "w3c"
}
```

And in the HAProxy config, make sure headers are forwarded:

```
frontend http_front
    bind *:80
    filter opentracing id ot-front config /etc/haproxy/otel-tracer.json

    # Forward trace headers to backend
    http-request set-header traceparent %[var(txn.ot.traceparent)]
    http-request set-header tracestate %[var(txn.ot.tracestate)]
```

## Verifying Traces

Enable the HAProxy stats page and check tracing stats:

```
frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
```

Send test traffic and verify:

```bash
curl -v http://localhost/api/test
# Check Collector logs for received spans
docker logs otel-collector 2>&1 | tail -20
```

## Summary

HAProxy's OpenTracing filter provides distributed tracing capability that can be bridged to OpenTelemetry. Configure the tracer plugin with OTLP HTTP export, enable the filter on frontends and backends, and ensure W3C trace context headers are propagated. While the configuration is more involved than natively-instrumented proxies, it gives you the same end-to-end trace visibility through your HAProxy deployment.
