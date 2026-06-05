# How to Configure Instrumentation Exclusion Rules via Declarative Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Instrumentation, Exclusion Rules, Health Check

Description: Configure OpenTelemetry declarative YAML to exclude health check endpoints and other noisy instrumentation from your telemetry.

Health check endpoints, readiness probes, and Kubernetes liveness checks generate a constant stream of spans and metrics that add noise without adding insight. Every 10 seconds, your load balancer hits `/health`, and every one of those requests creates a trace that clutters your dashboards. This post shows how to configure exclusion rules in your OpenTelemetry declarative configuration to filter this noise at the source.

## The Problem: Noisy Telemetry

A typical Kubernetes service gets hit by health checks every 10 seconds from multiple sources:

- Kubernetes liveness probe: `GET /healthz`
- Kubernetes readiness probe: `GET /ready`
- Load balancer health check: `GET /health`
- Service mesh sidecar: `GET /status`

At 10-second intervals, that is 6 health check spans per minute per pod. With 50 pods, that is 300 spans per minute of zero-value telemetry. It costs money to export, store, and index. And it drowns out real traces in your UI.

## Approach 1: SDK-Level Sampling Exclusion

The cleanest approach is to drop health check traces before they are recorded or exported. Declarative configuration supports rule-based sampling through the composite sampler:

```yaml
# otel-config.yaml

file_format: "1.0"

resource:
  attributes:
    - name: service.name
      value: "checkout-api"
    - name: deployment.environment.name
      value: "production"

tracer_provider:
  processors:
    - batch:
        exporter:
          otlp_grpc:
            endpoint: "http://collector:4317"
  sampler:
    composite/development:
      rule_based:
        rules:
          # Drop health check routes
          - attribute_values:
              key: http.route
              values:
                - "/health"
                - "/healthz"
                - "/ready"
                - "/readiness"
                - "/liveness"
                - "/status"
                - "/favicon.ico"
                - "/robots.txt"
                - "/metrics"  # Prometheus scrape endpoint
            sampler:
              always_off:

          # Sample everything else at 10%
          - sampler:
              parent_threshold:
                root:
                  probability:
                    ratio: 0.1
```

With this configuration, the SDK drops requests whose `http.route` attribute matches one of those values and does not export them. Because route attributes are set by HTTP instrumentation, check your framework's instrumentation behavior before relying on a route-based rule for every endpoint.

## Approach 2: Pattern-Based Exclusion with Wildcards

For more flexible matching, use attribute pattern rules:

```yaml
tracer_provider:
  processors:
    - batch:
        exporter:
          otlp_grpc:
            endpoint: "http://collector:4317"
  sampler:
    composite/development:
      rule_based:
        rules:
          # Exact matches
          - attribute_values:
              key: http.route
              values:
                - "/health"
                - "/ready"
            sampler:
              always_off:

          # Pattern matches
          - attribute_patterns:
              key: url.path
              included:
                - "/internal/*"
                - "/admin/heartbeat*"
                - "*/ping"
                - "/static/*"
                - "/assets/*"
                - "*.css"
                - "*.js"
                - "*.png"
            sampler:
              always_off:

          # Sample everything else at 10%
          - sampler:
              parent_threshold:
                root:
                  probability:
                    ratio: 0.1
```

## Approach 3: Java Agent Specific Exclusion

The OpenTelemetry Java agent supports declarative mappings for instrumentation settings and agent-specific options:

```yaml
# otel-config.yaml for Java agent
file_format: "1.0"

resource:
  attributes:
    - name: service.name
      value: "order-service"

tracer_provider:
  processors:
    - batch:
        exporter:
          otlp_grpc:
            endpoint: "http://collector:4317"
  sampler:
    composite/development:
      rule_based:
        rules:
          # Drop health check routes
          - attribute_values:
              key: http.route
              values:
                - "/actuator/health"
                - "/actuator/info"
                - "/actuator/prometheus"
            sampler:
              always_off:

          # Sample everything else at 10%
          - sampler:
              parent_threshold:
                root:
                  probability:
                    ratio: 0.1

instrumentation/development:
  java:
    agent:
      instrumentation_mode: default

# Disable entire instrumentation libraries or exclude classes.
distribution:
  javaagent:
    instrumentation:
      disabled:
        - "spring_scheduling"      # periodic tasks create noisy spans
        - "spring_boot_actuator"   # actuator endpoints
    exclude_classes:
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
    trace_conditions:
      - 'span.attributes["http.route"] == "/health"'
      - 'span.attributes["http.route"] == "/healthz"'
      - 'span.attributes["http.route"] == "/ready"'
      - 'span.attributes["url.path"] == "/health"'
      - 'span.attributes["url.path"] == "/healthz"'
      - 'span.name == "GET /health"'
      - 'span.name == "GET /healthz"'
      - 'span.name == "GET /ready"'

  # Also filter metrics from health check endpoints
  filter/health-metrics:
    error_mode: ignore
    metric_conditions:
      - 'datapoint.attributes["http.route"] == "/health"'
      - 'datapoint.attributes["http.route"] == "/healthz"'

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

Another option is to keep the instrumentation active but selectively drop certain traces with a rule-based sampler:

```yaml
tracer_provider:
  processors:
    - batch:
        exporter:
          otlp_grpc:
            endpoint: "http://collector:4317"
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: 0.1
```

Use this baseline sampler when you only need probabilistic sampling. Use the composite rule-based sampler in the earlier examples when you need attribute-based drops.

```yaml
tracer_provider:
  sampler:
    composite/development:
      rule_based:
        rules:
          # Never sample health checks
          - attribute_patterns:
              key: http.route
              included:
                - "/health*"
            sampler:
              always_off:

          # Never sample readiness checks
          - attribute_patterns:
              key: http.route
              included:
                - "/ready*"
            sampler:
              always_off:

          # Sample everything else at 10%
          - sampler:
              parent_threshold:
                root:
                  probability:
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
          otlp_grpc:
            endpoint: "http://collector:4317"

  views:
    # Keep the HTTP server duration metric but limit exported attributes
    - selector:
        instrument_name: "http.server.request.duration"
        meter_name: "io.opentelemetry.instrumentation.spring-webmvc"
      stream:
        attribute_keys:
          included:
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
file_format: "1.0"

resource:
  attributes:
    - name: service.name
      value: "${SERVICE_NAME}"
    - name: deployment.environment.name
      value: "${DEPLOY_ENV}"

tracer_provider:
  processors:
    - batch:
        schedule_delay: 5000
        exporter:
          otlp_grpc:
            endpoint: "${COLLECTOR_ENDPOINT}"
  sampler:
    composite/development:
      rule_based:
        rules:
          - attribute_values:
              key: http.route
              values:
                - "/health"
                - "/healthz"
                - "/ready"
                - "/liveness"
                - "/metrics"
                - "/favicon.ico"
            sampler:
              always_off:
          - sampler:
              parent_threshold:
                root:
                  probability:
                    ratio: 0.1

meter_provider:
  readers:
    - periodic:
        interval: 60000
        exporter:
          otlp_grpc:
            endpoint: "${COLLECTOR_ENDPOINT}"

logger_provider:
  processors:
    - batch:
        exporter:
          otlp_grpc:
            endpoint: "${COLLECTOR_ENDPOINT}"

propagator:
  composite:
    - tracecontext:
    - baggage:
```

## Wrapping Up

Filtering noisy telemetry at the source is one of the highest-ROI optimizations you can make. It reduces costs, improves signal-to-noise ratio, and makes your dashboards more useful. Start with health check endpoints, then look at other high-volume, low-value traffic like static asset requests and internal status pages. The declarative configuration format makes these exclusion rules visible, reviewable, and version-controlled alongside the rest of your observability setup.
