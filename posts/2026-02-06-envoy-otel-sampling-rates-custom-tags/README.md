# How to Tune Envoy OpenTelemetry Sampling Rates, Max Tag Length, and Custom Tags for Production Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Envoy, Sampling, Production Tuning

Description: Tune Envoy OpenTelemetry tracing settings including sampling rates, max tag length, and custom tags for production traffic volumes.

Running Envoy with OpenTelemetry tracing in production requires careful tuning. Tracing every request generates enormous amounts of data and adds latency to each request. This post covers how to configure sampling rates, tag sizes, and custom tags to get useful trace data without overwhelming your infrastructure.

## Configuring Sampling Rates

Envoy supports several sampling strategies. The simplest is random sampling, which traces a fixed percentage of requests:

```yaml
# envoy.yaml
http_connection_manager:
  tracing:
    provider:
      name: envoy.tracers.opentelemetry
      typed_config:
        "@type": type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig
        grpc_service:
          envoy_grpc:
            cluster_name: otel_collector
        service_name: envoy-proxy
    # Trace 1% of requests
    random_sampling:
      value: 1.0
    # Maximum path tag length (characters)
    max_path_tag_length: 256
```

A 1% sampling rate means roughly 1 in 100 requests generates a trace. For a service handling 10,000 requests per second, that is still 100 traces per second.

### Client-Driven Sampling

Envoy can also defer the sampling decision to the client. If the incoming request has a `traceparent` header with the sampled flag set, Envoy traces that request regardless of its own sampling rate:

```yaml
tracing:
  provider:
    name: envoy.tracers.opentelemetry
    typed_config:
      "@type": type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig
      grpc_service:
        envoy_grpc:
          cluster_name: otel_collector
      service_name: envoy-proxy
  # Use client-side sampling decision when traceparent is present
  random_sampling:
    value: 5.0
```

When a `traceparent` header arrives with the sampled bit (`01`), Envoy creates a span. When no header is present, Envoy uses its own sampling rate (5% in this example).

## Configuring Max Tag Length

By default, Envoy truncates long tag values (like URLs) to 256 characters. For APIs with long query strings, this can lose important context:

```yaml
tracing:
  max_path_tag_length: 512
```

Be cautious with very large values. Long tags increase the size of each span and can cause memory pressure in the Collector. A value of 512 works for most APIs. If you have URLs with long base64-encoded tokens, consider stripping them in a Collector processor instead of increasing the tag length.

## Adding Custom Tags

Custom tags add business context to traces. Configure them at the route or virtual host level:

```yaml
route_config:
  virtual_hosts:
    - name: api
      domains: ["*"]
      routes:
        - match:
            prefix: "/api/v2/"
          route:
            cluster: backend_v2
          # Custom tags for this route
          request_headers_to_add:
            - header:
                key: "x-envoy-decorator-operation"
                value: "api-v2"
          decorator:
            operation: api-v2-route
          # Add custom tracing tags
          tracing:
            custom_tags:
              - tag: "api.version"
                literal:
                  value: "v2"
              - tag: "route.name"
                literal:
                  value: "api-v2-route"
              # Extract a tag from a request header
              - tag: "tenant.id"
                request_header:
                  name: "X-Tenant-ID"
                  default_value: "unknown"
              # Extract from metadata
              - tag: "upstream.zone"
                metadata:
                  kind:
                    host: {}
                  metadata_key:
                    key: "envoy.lb"
                    path:
                      - key: "zone"
```

These custom tags appear on every span generated for requests matching this route.

## Per-Route Sampling Overrides

Different routes may need different sampling rates. High-traffic health check endpoints can be sampled at a lower rate:

```yaml
routes:
  # Health checks - sample rarely
  - match:
      prefix: "/health"
    route:
      cluster: backend
    tracing:
      overall_sampling:
        value: 0.1
    decorator:
      operation: health-check

  # Critical payment API - sample everything
  - match:
      prefix: "/api/payments"
    route:
      cluster: payment_service
    tracing:
      overall_sampling:
        value: 100
    decorator:
      operation: payment-api

  # General API - sample moderately
  - match:
      prefix: "/api/"
    route:
      cluster: backend
    tracing:
      overall_sampling:
        value: 5.0
    decorator:
      operation: general-api
```

## Using the Collector for Tail-Based Sampling

Instead of deciding at Envoy whether to sample, you can trace everything and let the Collector decide. This is called tail-based sampling:

```yaml
# Envoy: trace everything
tracing:
  random_sampling:
    value: 100

# Collector: filter after the fact
processors:
  tail_sampling:
    decision_wait: 30s
    num_traces: 50000
    policies:
      # Keep all error traces
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      # Keep slow traces
      - name: slow-requests
        type: latency
        latency:
          threshold_ms: 2000
      # Keep traces from critical paths
      - name: critical-paths
        type: string_attribute
        string_attribute:
          key: api.version
          values: ["v2"]
      # Sample 5% of everything else
      - name: default
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
```

Tail-based sampling gives better results because the decision includes the full trace context (errors, latency, etc.), but it requires the Collector to buffer traces in memory.

## Monitoring Tracing Overhead

Check Envoy stats to monitor the overhead of tracing:

```bash
# Spans started and finished
curl localhost:9901/stats | grep tracing

# gRPC export stats
curl localhost:9901/stats | grep otel_collector
```

Key metrics to watch:
- `tracing.opentelemetry.spans_sent`: How many spans were exported
- `tracing.opentelemetry.timer`: Time spent on tracing operations
- `cluster.otel_collector.upstream_rq_time`: Latency of OTLP export calls

If export latency is high, the Collector may be overloaded. Scale the Collector or reduce the sampling rate.

## Summary

Production Envoy tracing requires balancing data quality with overhead. Start with a low sampling rate (1-5%) and increase it for critical routes. Use custom tags to add business context, and set max tag length based on your URL patterns. Consider tail-based sampling in the Collector for the best trace selection, but be prepared for the memory cost. Monitor tracing overhead using Envoy's built-in stats.
