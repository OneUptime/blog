# How to Configure HAProxy OpenTelemetry Tracing with the OpenTracing Filter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, HAProxy, Tracing, OpenTracing Bridge

Description: Configure HAProxy to export distributed traces using the OpenTracing filter with an OTLP exporter bridge for OpenTelemetry integration.

HAProxy supports distributed tracing through its OpenTracing filter. While HAProxy uses the OpenTracing API natively, you can bridge this into OpenTelemetry by sending spans to an OpenTracing-compatible tracer protocol that the OpenTelemetry Collector can receive, then exporting them with OTLP. This post covers how to set up HAProxy tracing with the Collector in the middle.

Note: the OpenTracing filter is deprecated in HAProxy 3.4 and is scheduled for removal in HAProxy 3.5. For new HAProxy deployments, prefer the native OpenTelemetry filter available in HAProxy 3.4 and later.

## How HAProxy Tracing Works

HAProxy includes an OpenTracing filter that hooks into request processing when HAProxy is built with OpenTracing support. When enabled, the filter runs the spans and events you define in its configuration file. The filter communicates with an OpenTracing tracer plugin loaded as a shared library.

## Installing the Tracing Plugin

HAProxy's OpenTracing filter is compiled into HAProxy and uses the OpenTracing C wrapper plus a tracer plugin such as Jaeger's OpenTracing plugin. Build the wrapper and the tracer plugin first, then build HAProxy with `USE_OT=1`:

```bash
# Build the OpenTracing C wrapper for HAProxy
git clone https://github.com/haproxytech/opentracing-c-wrapper.git
cd opentracing-c-wrapper
./scripts/bootstrap
./configure --prefix=/opt --with-opentracing=/opt
make
sudo make install
```

When building HAProxy, enable the filter:

```bash
PKG_CONFIG_PATH=/opt/lib/pkgconfig make TARGET=linux-glibc USE_OT=1
./haproxy -vv | grep opentracing
```

You also need an OpenTracing-compatible tracer plugin. The HAProxy OpenTracing examples use Jaeger's C++ plugin, `libjaegertracing_plugin.so`.

## HAProxy Configuration

Configure HAProxy with the OpenTracing filter:

```text
# haproxy.cfg
global
    log stdout format raw local0 info

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
    filter opentracing id ot-front config /etc/haproxy/ot.cfg

    default_backend servers

backend servers
    balance roundrobin

    server s1 backend1:8080 check
    server s2 backend2:8080 check
```

## Tracer Configuration

Create the HAProxy OpenTracing filter configuration. The file referenced by `filter opentracing ... config` is not the tracer plugin's JSON or YAML file; it defines the tracer, scopes, events, and propagation behavior used by the HAProxy filter:

```text
# /etc/haproxy/ot.cfg
[ot-front]
    ot-tracer haproxy-tracer
        config /etc/haproxy/jaeger.yml
        plugin /usr/local/lib/libjaegertracing_plugin.so
        option hard-errors
        no option disabled
        rate-limit 100.0
        scopes frontend_http_request backend_http_request http_response

    ot-scope frontend_http_request
        span "HAProxy HTTP request" root
            tag "http.method" method
            tag "http.url" url
            tag "http.version" str("HTTP/") req.ver
        event on-frontend-http-request

    ot-scope backend_http_request
        span "HAProxy HTTP request"
            inject "ot-ctx" use-headers
        event on-backend-http-request

    ot-scope http_response
        span "HAProxy HTTP response" child-of "HAProxy HTTP request"
            tag "http.status_code" status
        finish *
        event on-http-response
```

Then create the tracer plugin configuration that points to the Collector's Jaeger receiver:

```yaml
# /etc/haproxy/jaeger.yml
service_name: haproxy

sampler:
  type: const
  param: 1

reporter:
  logSpans: true
  localAgentHostPort: otel-collector:6831
```

## Using the SPOE Approach

An alternative is using HAProxy's SPOE to send trace data to an agent process:

```text
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

backend otel-agent-backend
    mode tcp
    option spop-check
    server agent1 otel-agent:12345 check
```

The SPOE configuration:

```text
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
  jaeger:
    protocols:
      thrift_compact:
        endpoint: 0.0.0.0:6831
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

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
      receivers: [jaeger, otlp]
      processors: [resource, batch]
      exporters: [otlp]
```

## Docker Compose Setup

```yaml
version: "3.8"

services:
  haproxy:
    image: myorg/haproxy-opentracing:2.9
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg
      - ./ot.cfg:/etc/haproxy/ot.cfg
      - ./jaeger.yml:/etc/haproxy/jaeger.yml
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
      - "6831:6831/udp"

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

HAProxy can propagate trace context headers to backends. Configure propagation in the HAProxy OpenTracing filter config with `inject ... use-headers`:

```text
ot-scope backend_http_request
    span "HAProxy HTTP request"
        inject "ot-ctx" use-headers
    event on-backend-http-request
```

The exact header format depends on the OpenTracing tracer plugin. With the Jaeger plugin, the injected header is Jaeger's propagation header rather than W3C `traceparent`.

## Verifying Traces

Enable the HAProxy stats page and HAProxy runtime socket:

```text
global
    stats socket /tmp/haproxy.sock mode 660 level admin

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
# Check OpenTracing filter runtime status
echo "flt-ot status" | socat - UNIX-CONNECT:/tmp/haproxy.sock
```

## Summary

HAProxy's OpenTracing filter provides distributed tracing capability that can be bridged into OpenTelemetry through the Collector. Configure the HAProxy OpenTracing filter, point its tracer plugin at a Collector receiver such as Jaeger, export from the Collector with OTLP, and let the filter inject propagation headers. For new deployments on HAProxy 3.4 and later, use the native OpenTelemetry filter instead of starting a new OpenTracing setup.
