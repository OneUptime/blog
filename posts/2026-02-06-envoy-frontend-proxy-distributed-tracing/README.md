# How to Set Up Envoy as a Front-End Proxy with Full Distributed Tracing via OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Envoy, Front-End Proxy, Distributed Tracing

Description: Set up Envoy as a front-end proxy with complete distributed tracing that connects client requests through Envoy to backend microservices.

Using Envoy as a front-end proxy is a common pattern for API gateways and edge proxies. When you add OpenTelemetry tracing, you get visibility into the entire request path from the client through Envoy to your backend services. This post walks through setting up Envoy as a front-end proxy with full distributed tracing.

## Architecture

The setup looks like this:

```
Client -> Envoy (front-end proxy) -> Service A -> Service B -> Database
                |
                v
          OTel Collector -> Tracing Backend
```

Envoy creates spans for each proxied request. Backend services create their own spans. The trace context propagated through headers ties everything together.

## Envoy Front-End Proxy Configuration

```yaml
# envoy.yaml
admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901

static_resources:
  listeners:
    - name: frontend_listener
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 80
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: frontend
                # Generate a request ID if the client does not provide one
                generate_request_id: true
                tracing:
                  provider:
                    name: envoy.tracers.opentelemetry
                    typed_config:
                      "@type": type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig
                      grpc_service:
                        envoy_grpc:
                          cluster_name: otel_collector
                        timeout: 0.500s
                      service_name: envoy-frontend
                  # Trace 100% of requests (adjust for production)
                  random_sampling:
                    value: 100
                route_config:
                  name: routes
                  virtual_hosts:
                    - name: api
                      domains: ["*"]
                      routes:
                        # Route to user service
                        - match:
                            prefix: "/api/users"
                          route:
                            cluster: user_service
                          decorator:
                            operation: user-service-route
                        # Route to order service
                        - match:
                            prefix: "/api/orders"
                          route:
                            cluster: order_service
                          decorator:
                            operation: order-service-route
                        # Default route
                        - match:
                            prefix: "/"
                          route:
                            cluster: default_service
                          decorator:
                            operation: default-route
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: user_service
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: user_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: user-svc
                      port_value: 8080

    - name: order_service
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: order_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: order-svc
                      port_value: 8080

    - name: default_service
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: default_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: web-app
                      port_value: 8080

    - name: otel_collector
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      typed_extension_protocol_options:
        envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
          "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
          explicit_http_config:
            http2_protocol_options: {}
      load_assignment:
        cluster_name: otel_collector
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: otel-collector
                      port_value: 4317
```

## Instrumented Backend Service

Here is a Go backend service that receives trace context from Envoy and continues the trace:

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"

    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/propagation"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func initTracer() *sdktrace.TracerProvider {
    exporter, _ := otlptracegrpc.New(context.Background())
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
    )
    otel.SetTracerProvider(tp)
    // Set up W3C Trace Context propagation
    otel.SetTextMapPropagator(
        propagation.NewCompositeTextMapPropagator(
            propagation.TraceContext{},
            propagation.Baggage{},
        ),
    )
    return tp
}

func main() {
    tp := initTracer()
    defer tp.Shutdown(context.Background())

    // Wrap the handler with OpenTelemetry HTTP instrumentation
    handler := otelhttp.NewHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // This handler automatically picks up the trace from Envoy
        tracer := otel.Tracer("user-service")
        _, span := tracer.Start(r.Context(), "get-users")
        defer span.End()

        json.NewEncoder(w).Encode(map[string]string{"user": "alice"})
    }), "user-service")

    http.Handle("/api/users/", handler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Docker Compose Full Stack

```yaml
version: "3.8"

services:
  envoy:
    image: envoyproxy/envoy:v1.29-latest
    volumes:
      - ./envoy.yaml:/etc/envoy/envoy.yaml
    ports:
      - "80:80"
      - "9901:9901"
    command: ["-c", "/etc/envoy/envoy.yaml"]

  user-svc:
    build: ./user-service
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=otel-collector:4317
      - OTEL_SERVICE_NAME=user-service

  order-svc:
    build: ./order-service
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=otel-collector:4317
      - OTEL_SERVICE_NAME=order-service

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
```

## What the Trace Looks Like

A request to `GET /api/users/123` produces this trace:

```
Trace ID: 4bf92f3577b34da6a3ce929d0e0e4736
  |
  +-- envoy-frontend: user-service-route [10ms]
  |     http.method: GET
  |     http.url: /api/users/123
  |     upstream_cluster: user_service
  |     http.status_code: 200
  |
  +---- user-service: GET /api/users/ [8ms]
  |       http.method: GET
  |       http.status_code: 200
  |
  +------ user-service: get-users [5ms]
```

The trace shows Envoy's span as the parent, with the backend service spans nested underneath.

## Summary

Envoy as a front-end proxy with OpenTelemetry tracing gives you visibility into every request from the edge to your backend services. The trace context propagates automatically through W3C headers, connecting Envoy's spans with your application spans. This is essential for diagnosing latency issues, identifying slow services, and understanding request routing in microservice architectures.
