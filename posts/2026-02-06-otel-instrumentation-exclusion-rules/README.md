# How to Configure Instrumentation Exclusion Rules (Ignore Health Check Endpoints) via Declarative Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Instrumentation, Exclusion Rules, Health Checks

Description: Configure OpenTelemetry declarative YAML to exclude health check endpoints and other noisy instrumentation from your telemetry.

Health check endpoints, readiness probes, and Kubernetes liveness checks generate a constant stream of spans and metrics that add noise without adding insight. Every 10 seconds, your load balancer hits `/health`, and every one of those requests creates a trace that clutters your dashboards. This post shows how to configure exclusion rules in your OpenTelemetry declarative configuration to filter this noise at the source.

## The Problem: Noisy Telemetry

A typical Kubernetes service gets hit by health checks every 10 seconds from multiple sources:

- Kubernetes liveness probe: `GET /healthz`
- Kubernetes readiness probe: `GET /ready`
- Load balancer health check: `GET /health`
- Service mesh sidecar: `GET /status`

At 10-second intervals, that is 6 health check spans per minute per pod. With 50 pods, that is 300 spans per minute of zero-value telemetry. It costs money to export, store, and index. And it drowns out real traces in your UI.

## Approach 1: SDK-Level Instrumentation Exclusion

The cleanest approach is to prevent these spans from being created in the first place. The declarative configuration supports instrumentation-level exclusion rules:

```yaml
# otel-config.yaml
file_format: "0.3"

resource:
  attributes:
    service.name: "checkout-api"
    deployment.environment: "production"

# Instrumentation configuration
instrumentation:
  general:
    http:
      server:
        # Exclude specific routes from instrumentation
        exclude_urls:
          - "/health"
          - "/healthz"
          - "/ready"
          - "/readiness"
          - "/liveness"
          - "/status"
          - "/favicon.ico"
          - "/robots.txt"
          - "/metrics"  # Prometheus scrape endpoint

tracer_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "http://collector:4317"
            protocol: "grpc"
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: 0.1
```

With this configuration, the SDK will not create spans for any HTTP server request matching those URL patterns. No spans means no processing, no exporting, and no storage cost.

## Approach 2: Pattern-Based Exclusion with Wildcards

For more flexible matching, use glob-style patterns:

```yaml
instrumentation:
  general:
    http:
      server:
        exclude_urls:
          # Exact matches
          - "/health"
          - "/ready"

          # Wildcard patterns
          - "/internal/*"        # all internal endpoints
          - "/admin/heartbeat*"  # admin heartbeat variants
          - "*/ping"             # any path ending with /ping

          # Static assets (if served by the same process)
          - "/static/*"
          - "/assets/*"
          - "*.css"
          - "*.js"
          - "*.png"
```

## Approach 3: Java Agent Specific Exclusion

The OpenTelemetry Java agent has its own instrumentation exclusion configuration within the declarative format:

```yaml
# otel-config.yaml for Java agent
file_format: "0.3"

resource:
  attributes:
    service.name: "order-service"

instrumentation:
  java:
    http:
      server:
        # Exclude health check URLs
        exclude_urls:
          - "/actuator/health"
          - "/actuator/info"
          - "/actuator/prometheus"

    # Disable entire instrumentation libraries
    disabled_instrumentations:
      - "spring-scheduling"      # periodic tasks create noisy spans
      - "spring-boot-actuator"   # actuator endpoints

    # Exclude specific classes from instrumentation
    excluded_classes:
      - "com.example.internal.HealthController"
      - "com.example.internal.MetricsController"
```

## Approach 4: Collector-Side Filtering

If you cannot filter at the SDK level (for example, you are using auto-instrumentation you cannot configure), filter at the OpenTelemetry Collector using the filter processor:

```yaml
# collector-config.yaml
processors:
  filter/health:
    error_mode: ignore
    traces:
      span:
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/healthz"'
        - 'attributes["http.route"] == "/ready"'
        - 'attributes["url.path"] == "/health"'
        - 'attributes["url.path"] == "/healthz"'
        - 'name == "GET /health"'
        - 'name == "GET /healthz"'
        - 'name == "GET /ready"'

  # Also filter metrics from health check endpoints
  filter/health-metrics:
    error_mode: ignore
    metrics:
      datapoint:
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/healthz"'

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter/health, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [filter/health-metrics, batch]
      exporters: [otlp]
```

## Approach 5: Sampler-Based Exclusion

Another option is to use a custom sampler that drops specific spans based on attributes. This is useful when you want to keep the instrumentation active but selectively drop certain traces:

```yaml
tracer_provider:
  sampler:
    parent_based:
      root:
        rule_based:
          rules:
            # Never sample health checks
            - attribute: "http.route"
              pattern: "/health.*"
              sampler:
                always_off: {}

            # Never sample readiness checks
            - attribute: "http.route"
              pattern: "/ready.*"
              sampler:
                always_off: {}

            # Sample everything else at 10%
            - attribute: "*"
              pattern: "*"
              sampler:
                trace_id_ratio_based:
                  ratio: 0.1
```

## Excluding Metric Instruments

For metrics, you might want to exclude instruments generated by health check libraries:

```yaml
meter_provider:
  readers:
    - periodic:
        interval: 60000
        exporter:
          otlp:
            endpoint: "http://collector:4317"
            protocol: "grpc"

  views:
    # Drop the health check duration histogram entirely
    - selector:
        instrument_name: "http.server.request.duration"
        meter_name: "io.opentelemetry.instrumentation.spring-webmvc"
      stream:
        attribute_keys:
          - "http.request.method"
          - "http.response.status_code"
          - "http.route"
        # This view keeps the metric but removes high-cardinality attributes

    # Or drop a specific meter entirely
    - selector:
        meter_name: "health.check.library"
      stream:
        aggregation:
          drop: {}
```

## A Complete Production Configuration

Here is a full configuration that combines SDK-level exclusion with sensible defaults:

```yaml
file_format: "0.3"

resource:
  attributes:
    service.name: "${SERVICE_NAME}"
    deployment.environment: "${DEPLOY_ENV}"

instrumentation:
  general:
    http:
      server:
        exclude_urls:
          - "/health"
          - "/healthz"
          - "/ready"
          - "/liveness"
          - "/metrics"
          - "/favicon.ico"

tracer_provider:
  processors:
    - batch:
        schedule_delay: 5000
        exporter:
          otlp:
            endpoint: "${COLLECTOR_ENDPOINT}"
            protocol: "grpc"
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: 0.1

meter_provider:
  readers:
    - periodic:
        interval: 60000
        exporter:
          otlp:
            endpoint: "${COLLECTOR_ENDPOINT}"
            protocol: "grpc"

logger_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "${COLLECTOR_ENDPOINT}"
            protocol: "grpc"

propagator:
  composite: [tracecontext, baggage]
```

## Wrapping Up

Filtering noisy telemetry at the source is one of the highest-ROI optimizations you can make. It reduces costs, improves signal-to-noise ratio, and makes your dashboards more useful. Start with health check endpoints, then look at other high-volume, low-value traffic like static asset requests and internal status pages. The declarative configuration format makes these exclusion rules visible, reviewable, and version-controlled alongside the rest of your observability setup.
