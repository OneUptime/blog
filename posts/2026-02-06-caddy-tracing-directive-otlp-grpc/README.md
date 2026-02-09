# How to Enable OpenTelemetry Tracing in Caddy Server with the tracing Directive and OTLP gRPC Export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Caddy, Tracing, OTLP gRPC

Description: Enable OpenTelemetry distributed tracing in Caddy Server using the built-in tracing directive to export spans via OTLP gRPC to your Collector.

Caddy Server has built-in OpenTelemetry tracing support through its `tracing` directive. When enabled, Caddy generates a span for every HTTP request it handles, including request details, response status, and timing information. The spans are exported via OTLP gRPC to your OpenTelemetry Collector.

## Enabling the Tracing Directive

Add the `tracing` directive to your Caddyfile:

```
# Caddyfile
{
    # Global tracing configuration
    tracing {
        span "caddy-server"
    }
}

:8080 {
    # Enable tracing for this site
    tracing

    # Your reverse proxy or file server config
    reverse_proxy localhost:3000
}
```

By default, Caddy sends traces to `localhost:4317` via OTLP gRPC. To customize the endpoint, set environment variables:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317
export OTEL_SERVICE_NAME=caddy-server
caddy run --config Caddyfile
```

## Collector Configuration

Set up the Collector to receive Caddy traces:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
    send_batch_size: 256

  resource:
    attributes:
      - key: service.type
        value: "reverse-proxy"
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

## Understanding Caddy Trace Spans

Each HTTP request through Caddy produces a span with these attributes:

```
Span Name: HTTP GET /api/users
Attributes:
  http.method:       GET
  http.url:          /api/users
  http.status_code:  200
  http.scheme:       https
  net.host.name:     example.com
  net.host.port:     443
  net.peer.ip:       10.0.0.5
  http.user_agent:   curl/8.1
```

The span duration reflects the total time Caddy spent handling the request, including upstream response time when reverse proxying.

## Docker Compose Setup

Run Caddy with tracing in Docker Compose alongside the Collector:

```yaml
version: "3.8"

services:
  caddy:
    image: caddy:latest
    container_name: caddy
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=caddy-proxy
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
    ports:
      - "80:80"
      - "443:443"
    networks:
      - app-network

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    container_name: otel-collector
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
    networks:
      - app-network

  # Backend application
  api:
    image: myorg/api:latest
    container_name: api
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=api-backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

The Caddyfile for this setup:

```
# Caddyfile
{
    tracing {
        span "caddy"
    }
}

:80 {
    tracing
    reverse_proxy api:8080
}
```

## Tracing Specific Routes

You can enable tracing on specific route matchers instead of globally:

```
:80 {
    # Only trace API routes
    @api path /api/*
    handle @api {
        tracing
        reverse_proxy api:8080
    }

    # Static files without tracing
    handle {
        file_server
        root * /var/www/html
    }
}
```

## Setting Custom Span Attributes

Use the `header_up` directive in combination with tracing to add custom headers that become span attributes:

```
:80 {
    tracing

    # Add a custom header that gets included in traces
    header X-Request-ID {http.request.uuid}

    reverse_proxy api:8080
}
```

## Configuring Sampling

Control how many requests get traced using the OpenTelemetry SDK environment variables:

```bash
# Trace 10% of requests
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1
```

For parent-based sampling, Caddy respects the incoming `traceparent` header. If the parent span was sampled, Caddy's span is also sampled. This maintains trace completeness across services.

## Verifying Traces

Send a request and verify traces appear:

```bash
# Make a request
curl -v http://localhost:80/api/users

# Check Collector logs
docker logs otel-collector 2>&1 | tail -20
```

You should see the Collector report receiving spans from Caddy.

## Summary

Caddy's built-in `tracing` directive makes it straightforward to add OpenTelemetry distributed tracing to your reverse proxy. Add the directive to your Caddyfile, set the OTLP endpoint via environment variables, and traces flow to your Collector. Combined with tracing in your backend services, you get end-to-end visibility from the client request through Caddy to your application.
