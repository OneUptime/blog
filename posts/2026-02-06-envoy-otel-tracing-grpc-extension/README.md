# How to Configure Envoy Proxy OpenTelemetry Tracing with the envoy.tracers.opentelemetry gRPC Extension

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Envoy Proxy, Tracing, gRPC Extension

Description: Configure Envoy Proxy to export distributed traces using the native envoy.tracers.opentelemetry extension with OTLP gRPC export to the Collector.

Envoy Proxy includes a native OpenTelemetry tracing extension called `envoy.tracers.opentelemetry`. This extension generates spans for every request passing through Envoy and exports them via OTLP gRPC to an OpenTelemetry Collector. It replaces older tracing integrations like Zipkin and Jaeger with a standards-based approach.

## Basic Envoy Configuration

Here is an Envoy config that enables OpenTelemetry tracing:

```yaml
# envoy.yaml
static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 8080
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                # Enable tracing on the connection manager
                tracing:
                  provider:
                    name: envoy.tracers.opentelemetry
                    typed_config:
                      "@type": type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig
                      grpc_service:
                        envoy_grpc:
                          cluster_name: opentelemetry_collector
                        timeout: 0.250s
                      service_name: envoy-proxy
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: backend
                      domains: ["*"]
                      routes:
                        - match:
                            prefix: "/"
                          route:
                            cluster: backend_service
                          # Enable tracing on this route
                          decorator:
                            operation: backend_operation
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    # The backend service cluster
    - name: backend_service
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: backend_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: backend
                      port_value: 8080

    # The OpenTelemetry Collector cluster
    - name: opentelemetry_collector
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      typed_extension_protocol_options:
        envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
          "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
          explicit_http_config:
            http2_protocol_options: {}
      load_assignment:
        cluster_name: opentelemetry_collector
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: otel-collector
                      port_value: 4317
```

The key pieces here are:

1. The `tracing` block in the HTTP connection manager configures the OpenTelemetry provider
2. The `opentelemetry_collector` cluster defines the gRPC connection to the Collector
3. The `http2_protocol_options` is required because OTLP gRPC uses HTTP/2

## Collector Configuration

The Collector receives traces from Envoy via OTLP gRPC:

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
    send_batch_size: 512

exporters:
  otlp:
    endpoint: "your-tracing-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

## Docker Compose Setup

```yaml
version: "3.8"

services:
  envoy:
    image: envoyproxy/envoy:v1.29-latest
    volumes:
      - ./envoy.yaml:/etc/envoy/envoy.yaml
    ports:
      - "8080:8080"
      - "9901:9901"
    command: ["-c", "/etc/envoy/envoy.yaml"]
    depends_on:
      - otel-collector
      - backend

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"

  backend:
    image: myorg/backend:latest
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=backend-service
```

## Understanding Envoy Trace Spans

Each request through Envoy generates a span with these attributes:

```
Span: ingress_http backend_operation
Attributes:
  http.method:               GET
  http.url:                  /api/users
  http.protocol:             HTTP/1.1
  http.status_code:          200
  upstream_cluster:          backend_service
  upstream_cluster.name:     backend_service
  response_size:             1234
  request_size:              0
  response_flags:            -
  node_id:                   envoy-node-1
  zone:                      us-east-1
```

The `response_flags` attribute indicates if anything went wrong. Common flags include `UH` (upstream host unhealthy), `UF` (upstream connection failure), and `UT` (upstream request timeout).

## Configuring Trace Propagation

Envoy propagates trace context using W3C Trace Context headers by default with the OpenTelemetry tracer. The incoming `traceparent` header is read, a child span is created, and an updated `traceparent` is forwarded to the upstream.

To also propagate B3 headers for backward compatibility:

```yaml
tracing:
  provider:
    name: envoy.tracers.opentelemetry
    typed_config:
      "@type": type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig
      grpc_service:
        envoy_grpc:
          cluster_name: opentelemetry_collector
      service_name: envoy-proxy
```

## Testing the Setup

Send a request through Envoy and verify traces appear:

```bash
# Send a traced request
curl -H "traceparent: 00-abcdef0123456789abcdef0123456789-0123456789abcdef-01" \
     http://localhost:8080/api/test

# Check Envoy stats for tracing
curl http://localhost:9901/stats | grep tracing
```

Look for `tracing.opentelemetry.spans_sent` in the Envoy stats output.

## Summary

The `envoy.tracers.opentelemetry` extension provides native OpenTelemetry tracing in Envoy. Configure the tracing provider in the HTTP connection manager, define a cluster for the Collector endpoint, and Envoy generates spans for every request. The extension handles W3C Trace Context propagation automatically, making it easy to include Envoy in your distributed tracing pipeline.
