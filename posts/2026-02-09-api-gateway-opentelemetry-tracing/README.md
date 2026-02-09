# How to Deploy API Gateway with OpenTelemetry Instrumentation for Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Gateway, OpenTelemetry, Observability

Description: Integrate OpenTelemetry tracing in API gateways to track request flows across microservices with distributed context propagation, span attributes, and trace sampling strategies.

---

OpenTelemetry provides vendor-neutral instrumentation for distributed tracing, enabling you to track requests as they flow through multiple services. API gateways are critical trace initiation points, creating root spans that capture the entire request lifecycle. Proper instrumentation at the gateway level provides complete visibility into API performance, latency distribution, and error propagation across your microservices architecture.

## Understanding Distributed Tracing

Distributed tracing follows a single request across multiple services, recording timing information and metadata at each hop. A trace consists of spans, with each span representing a unit of work. The API gateway creates the root span when a request arrives, and downstream services create child spans as they process the request.

Context propagation ensures spans connect properly across service boundaries. The gateway injects trace context into outgoing requests using standard headers like `traceparent` and `tracestate` defined by the W3C Trace Context specification.

## OpenTelemetry Collector Deployment

Deploy the OpenTelemetry Collector to receive traces from API gateways and forward them to your tracing backend.

```yaml
# otel-collector-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  collector.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 10s
        send_batch_size: 1024
      memory_limiter:
        check_interval: 1s
        limit_mib: 512
      attributes:
        actions:
        - key: environment
          value: production
          action: insert

    exporters:
      otlp:
        endpoint: jaeger:4317
        tls:
          insecure: true
      logging:
        loglevel: debug

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, batch, attributes]
          exporters: [otlp, logging]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector:0.91.0
        args:
        - --config=/etc/otel/collector.yaml
        ports:
        - containerPort: 4317  # OTLP gRPC
        - containerPort: 4318  # OTLP HTTP
        volumeMounts:
        - name: config
          mountPath: /etc/otel
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    app: otel-collector
  ports:
  - name: otlp-grpc
    port: 4317
    targetPort: 4317
  - name: otlp-http
    port: 4318
    targetPort: 4318
```

## NGINX OpenTelemetry Module

NGINX can send traces to OpenTelemetry collectors using the `ngx_otel_module`.

```nginx
# nginx-otel.conf
load_module modules/ngx_otel_module.so;

events {
    worker_connections 1024;
}

http {
    otel_exporter {
        endpoint otel-collector.observability.svc.cluster.local:4317;
    }

    otel_service_name "api-gateway";
    otel_trace on;

    upstream backend_service {
        server backend-service:8080;
    }

    server {
        listen 80;
        server_name api.example.com;

        location /api/ {
            otel_trace_context propagate;

            # Add custom span attributes
            otel_span_attr http.route "/api/";
            otel_span_attr service.name "backend-service";

            proxy_pass http://backend_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;

            # OpenTelemetry will automatically add traceparent header
        }
    }
}
```

Build NGINX with OpenTelemetry module:

```dockerfile
# Dockerfile
FROM nginx:1.25-alpine

# Install OpenTelemetry module
RUN apk add --no-cache curl && \
    curl -L https://github.com/open-telemetry/opentelemetry-cpp-contrib/releases/download/v1.0.0/ngx_otel_module.so \
    -o /usr/lib/nginx/modules/ngx_otel_module.so

COPY nginx-otel.conf /etc/nginx/nginx.conf
```

## Envoy OpenTelemetry Configuration

Envoy has native OpenTelemetry support with comprehensive tracing capabilities.

```yaml
# envoy-otel-config.yaml
static_resources:
  listeners:
  - name: main_listener
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
          generate_request_id: true
          tracing:
            provider:
              name: envoy.tracers.opentelemetry
              typed_config:
                "@type": type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig
                grpc_service:
                  envoy_grpc:
                    cluster_name: otel_collector
                  timeout: 0.5s
                service_name: "api-gateway"
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match:
                  prefix: "/api/"
                route:
                  cluster: backend_service
                decorator:
                  operation: "api_request"
                typed_per_filter_config:
                  envoy.filters.http.router:
                    "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
              start_child_span: true

  clusters:
  - name: backend_service
    connect_timeout: 5s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: backend_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: backend-service
                port_value: 8080

  - name: otel_collector
    connect_timeout: 1s
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
                address: otel-collector.observability.svc.cluster.local
                port_value: 4317
```

This configuration creates spans for all incoming requests and propagates trace context to backend services. The `decorator` field adds a custom operation name to spans.

## Istio OpenTelemetry Integration

Istio automatically instruments all traffic with distributed tracing using Envoy's tracing capabilities.

```yaml
# istio-telemetry-config.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-control-plane
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 100.0
        max_path_tag_length: 256
        custom_tags:
          environment:
            literal:
              value: "production"
          cluster:
            literal:
              value: "us-east-1"
    extensionProviders:
    - name: otel-tracing
      opentelemetry:
        port: 4317
        service: otel-collector.observability.svc.cluster.local
```

Configure Telemetry resource for fine-grained control:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: gateway-tracing
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 100.0
    customTags:
      http.url:
        header:
          name: ":path"
      http.method:
        header:
          name: ":method"
      user_agent:
        header:
          name: "user-agent"
```

## Kong OpenTelemetry Plugin

Kong supports OpenTelemetry through a plugin that exports traces to OTLP endpoints.

```bash
# Enable OpenTelemetry plugin
curl -X POST http://kong-admin:8001/plugins \
  --data "name=opentelemetry" \
  --data "config.endpoint=http://otel-collector.observability.svc.cluster.local:4318/v1/traces" \
  --data "config.resource_attributes.service.name=api-gateway" \
  --data "config.resource_attributes.environment=production" \
  --data "config.batch_span_count=100" \
  --data "config.batch_flush_delay=1"
```

Declarative configuration:

```yaml
# kong-otel-config.yaml
_format_version: "3.0"

plugins:
- name: opentelemetry
  config:
    endpoint: http://otel-collector.observability.svc.cluster.local:4318/v1/traces
    resource_attributes:
      service.name: api-gateway
      service.version: "1.0.0"
      deployment.environment: production
    batch_span_count: 100
    batch_flush_delay: 1
    headers:
      X-Custom-Header: custom-value
    propagation:
      default_format: w3c
      extract:
      - w3c
      - b3
      inject:
      - w3c

services:
- name: user-service
  url: http://user-service:8080
  routes:
  - name: user-route
    paths:
    - /api/users
```

## Trace Sampling Strategies

Sampling reduces overhead by capturing only a percentage of traces. Implement intelligent sampling to capture interesting traces while reducing volume.

```yaml
# OTEL Collector with tail sampling
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100
    expected_new_traces_per_sec: 10
    policies:
    - name: error-traces
      type: status_code
      status_code:
        status_codes:
        - ERROR
    - name: slow-traces
      type: latency
      latency:
        threshold_ms: 1000
    - name: probabilistic-sample
      type: probabilistic
      probabilistic:
        sampling_percentage: 10

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp]
```

This configuration always captures error traces and slow traces, while sampling 10% of normal traffic.

## Custom Span Attributes

Add custom attributes to spans for richer context.

```yaml
# Envoy custom span attributes
route_config:
  virtual_hosts:
  - name: backend
    routes:
    - match:
        prefix: "/api/users"
      route:
        cluster: user_service
      decorator:
        operation: "get_users"
      request_headers_to_add:
      - header:
          key: x-trace-user-id
          value: "%REQ(x-user-id)%"
      metadata:
        filter_metadata:
          envoy.filters.http.router:
            endpoint: "users"
            version: "v1"
```

## Monitoring Trace Pipeline

Monitor the health of your tracing infrastructure.

```yaml
# Prometheus metrics for OTEL Collector

# Traces received
rate(otelcol_receiver_accepted_spans[5m])

# Traces dropped
rate(otelcol_processor_dropped_spans[5m])

# Export failures
rate(otelcol_exporter_send_failed_spans[5m])

# Pipeline latency
histogram_quantile(0.95, otelcol_processor_batch_batch_send_size_bucket)
```

Create alerts for pipeline issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: otel-alerts
spec:
  groups:
  - name: opentelemetry
    rules:
    - alert: HighTraceDropRate
      expr: |
        rate(otelcol_processor_dropped_spans[5m]) > 100
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High trace drop rate in OTEL Collector"

    - alert: OTELExporterFailures
      expr: |
        rate(otelcol_exporter_send_failed_spans[5m]) > 10
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "OTEL Collector failing to export traces"
```

## Trace Visualization

Query and visualize traces in Jaeger or other tracing backends.

```bash
# Query traces by service
curl "http://jaeger-query:16686/api/traces?service=api-gateway&limit=20"

# Query slow traces
curl "http://jaeger-query:16686/api/traces?service=api-gateway&minDuration=1s"

# Query error traces
curl "http://jaeger-query:16686/api/traces?service=api-gateway&tags={\"error\":\"true\"}"
```

## Conclusion

OpenTelemetry instrumentation at the API gateway level provides comprehensive visibility into request flows across your microservices architecture. By creating root spans at the gateway and propagating trace context to downstream services, you can track requests end-to-end and identify performance bottlenecks, error sources, and architectural issues. Modern API gateways like Envoy, Istio, Kong, and NGINX support OpenTelemetry natively or through plugins. Implement intelligent sampling strategies to balance observability needs with infrastructure costs, and monitor your trace pipeline health to ensure reliable data collection.
