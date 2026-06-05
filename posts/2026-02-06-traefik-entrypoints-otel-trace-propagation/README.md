# How to Configure Traefik EntryPoints and Middleware for OpenTelemetry Trace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Traefik, Trace Propagation, Middleware

Description: Configure Traefik proxy entry points and middleware for OpenTelemetry distributed tracing with OTLP export and trace context propagation.

Traefik is a popular edge router and reverse proxy with native OpenTelemetry support. It can generate spans for every request, propagate trace context to backends, and export traces via OTLP. This post covers configuring Traefik entry points, middleware, and tracing for production use.

## Enabling OpenTelemetry in Traefik

Configure OpenTelemetry in the Traefik static configuration:

```yaml
# traefik.yaml (static configuration)

entryPoints:
  web:
    address: ":80"
    observability:
      traceVerbosity: detailed
  websecure:
    address: ":443"
    observability:
      traceVerbosity: detailed

api:
  dashboard: true

# OpenTelemetry tracing configuration
tracing:
  otlp:
    http:
      endpoint: http://otel-collector:4318/v1/traces

  # Service name in traces
  serviceName: traefik-proxy

  # Sampling rate (1.0 = 100%)
  sampleRate: 1.0

providers:
  docker:
    exposedByDefault: false
  file:
    directory: /etc/traefik/dynamic/
```

## Using gRPC Export

For gRPC-based OTLP export (more efficient):

```yaml
tracing:
  otlp:
    grpc:
      endpoint: otel-collector:4317
      insecure: true
  serviceName: traefik-proxy
  sampleRate: 0.1
```

## Dynamic Configuration with Middleware

Create middleware that adds custom headers and interacts with tracing:

```yaml
# /etc/traefik/dynamic/middleware.yaml
http:
  middlewares:
    # Add custom headers
    add-trace-headers:
      headers:
        customRequestHeaders:
          X-Forwarded-By: "traefik"

    # Rate limiting with trace integration
    rate-limit:
      rateLimit:
        average: 100
        burst: 50

    # Retry middleware
    retry-middleware:
      retry:
        attempts: 3
        initialInterval: 100ms

  routers:
    api-router:
      rule: "PathPrefix(`/api`)"
      entryPoints:
        - web
      middlewares:
        - add-trace-headers
        - rate-limit
        - retry-middleware
      service: api-service

    web-router:
      rule: "PathPrefix(`/`)"
      entryPoints:
        - web
      service: web-service

  services:
    api-service:
      loadBalancer:
        servers:
          - url: "http://api-backend:8080"
        healthCheck:
          path: /health
          interval: 10s

    web-service:
      loadBalancer:
        servers:
          - url: "http://web-backend:3000"
```

## Docker Labels Configuration

When using Docker provider, configure routing with container labels:

```yaml
# docker-compose.yaml
services:
  traefik:
    image: traefik:v3.6
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedByDefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.observability.traceVerbosity=detailed"
      - "--tracing.otlp.grpc=true"
      - "--tracing.otlp.grpc.endpoint=otel-collector:4317"
      - "--tracing.otlp.grpc.insecure=true"
      - "--tracing.serviceName=traefik"
      - "--tracing.sampleRate=1.0"
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

  api-service:
    image: myorg/api:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=PathPrefix(`/api`)"
      - "traefik.http.routers.api.entrypoints=web"
      - "traefik.http.routers.api.observability.traceVerbosity=detailed"
      - "traefik.http.services.api.loadbalancer.server.port=8080"
      # Apply middleware
      - "traefik.http.routers.api.middlewares=retry@docker"
      - "traefik.http.middlewares.retry.retry.attempts=3"
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=api-service

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
```

## Trace Context Propagation

Traefik automatically propagates W3C Trace Context headers. When a request arrives with a `traceparent` header, Traefik creates spans in the existing trace and forwards the updated context to the backend. This works out of the box with the default `tracecontext` propagator.

The trace flow looks like:

```text
Client -> Traefik (server span) -> Middleware spans (with traceVerbosity: detailed) -> Backend (client span)
```

With `traceVerbosity: detailed`, each middleware in the chain creates its own span, giving you visibility into middleware processing time. The default `minimal` trace verbosity creates the main server and client spans without per-middleware spans.

## Collector Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 512
  resource:
    attributes:
      - key: service.type
        value: reverse-proxy
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

## Traefik Metrics with OpenTelemetry

Traefik can also export metrics via OpenTelemetry:

```yaml
# traefik.yaml
metrics:
  otlp:
    grpc:
      endpoint: otel-collector:4317
      insecure: true
    pushInterval: 10s
    addEntryPointsLabels: true
    addRoutersLabels: true
    addServicesLabels: true
```

This exports metrics like request count, request duration, and error rates per entry point, router, and service.

## Sampling Configuration

For production, reduce the sampling rate:

```yaml
tracing:
  otlp:
    grpc:
      endpoint: otel-collector:4317
      insecure: true
  serviceName: traefik
  # Sample 5% of requests
  sampleRate: 0.05
```

Traefik also respects parent-based sampling. If an incoming request has a sampled `traceparent`, Traefik traces that request regardless of the local sampling rate.

## Summary

Traefik's native OpenTelemetry support makes it easy to add distributed tracing to your reverse proxy layer. Configure the OTLP exporter in the static configuration, and Traefik automatically creates spans for request handling and service routing. W3C Trace Context propagation works out of the box. Use Docker labels or file-based dynamic configuration for routing rules and middleware chains. Enable detailed trace verbosity when you need middleware spans for granular timing visibility.
