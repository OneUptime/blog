# How to Enable OpenTelemetry Tracing in Caddy Server with the tracing Directive

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Caddy, Tracing, OTLP gRPC

Description: Enable OpenTelemetry distributed tracing in Caddy Server using the built-in tracing directive to export spans via OTLP gRPC to your Collector.

Caddy Server has built-in OpenTelemetry tracing support through its `tracing` directive. When enabled, Caddy propagates an existing trace context or initializes a new one, and records HTTP span data for requests handled by that route or site. The examples below configure Caddy to export spans via OTLP gRPC to your OpenTelemetry Collector.

## Enabling the Tracing Directive

Add the `tracing` directive to your Caddyfile:

```text
# Caddyfile

:8080 {
    # Enable tracing for this site with a custom span name
    tracing {
        span "caddy-server"
    }

    # Your reverse proxy or file server config
    reverse_proxy localhost:3000
}
```

Configure the OTLP gRPC endpoint with OpenTelemetry environment variables:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
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
  debug:

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp, debug]
```

## Understanding Caddy Trace Spans

Each traced HTTP request through Caddy produces a span with HTTP semantic convention attributes. With the `span "caddy-server"` example above, a request might look like this:

```text
Span Name: caddy-server
Attributes:
  http.request.method:       GET
  url.path:                  /api/users
  http.response.status_code:  200
  url.scheme:                https
  server.address:            example.com
  server.port:               443
  client.address:            10.0.0.5
  user_agent.original:       curl/8.1
```

The span duration reflects the total time Caddy spent handling the request, including upstream response time when reverse proxying.

## Docker Compose Setup

Run Caddy with tracing in Docker Compose alongside the Collector:

```yaml
services:
  caddy:
    image: caddy:latest
    container_name: caddy
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_EXPORTER_OTLP_PROTOCOL=grpc
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
      - OTEL_EXPORTER_OTLP_PROTOCOL=grpc
      - OTEL_SERVICE_NAME=api-backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

The Caddyfile for this setup:

```text
# Caddyfile
:80 {
    tracing {
        span "caddy"
    }
    reverse_proxy api:8080
}
```

## Tracing Specific Routes

You can enable tracing on specific route matchers instead of globally:

```text
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

Use the `span_attributes` block in the `tracing` directive to add custom attributes to Caddy spans:

```text
:80 {
    tracing {
        span_attributes {
            service.type reverse-proxy
            request_path {http.request.uri.path}
        }
    }

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

With the `debug` exporter enabled in the Collector configuration above, you should see the Collector log the spans received from Caddy.

## Summary

Caddy's built-in `tracing` directive makes it straightforward to add OpenTelemetry distributed tracing to your reverse proxy. Add the directive to your Caddyfile, set the OTLP endpoint via environment variables, and traces flow to your Collector. Combined with tracing in your backend services, you get end-to-end visibility from the client request through Caddy to your application.
