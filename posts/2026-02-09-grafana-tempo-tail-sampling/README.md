# How to implement Grafana Tempo with tail-based sampling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Tempo, Tracing

Description: Learn how to configure tail-based sampling in Grafana Tempo to intelligently select which traces to keep based on content rather than randomness.

---

Head-based sampling makes decisions about keeping traces at the start of a request, before you know if anything interesting happens. Tail-based sampling waits until the trace completes, then decides whether to keep it based on actual characteristics like errors, latency, or specific service involvement. This approach captures the traces you actually want to investigate.

## Understanding Tail-Based Sampling

Traditional head-based sampling keeps every Nth trace, chosen at the entry point before processing begins. This means you might discard a critical trace showing a rare error because it happened to fall outside your sampling rate.

Tail-based sampling collects complete traces in memory, evaluates them against policies after they finish, and only stores traces that match your criteria. You keep all error traces and slow requests while sampling away boring successful requests.

## Setting Up Tempo for Tail Sampling

Tempo's tail sampling requires specific configuration and enough memory to buffer traces during evaluation.

```yaml
# tempo-config.yaml
server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        http:
        grpc:

ingester:
  max_block_duration: 5m

compactor:
  compaction:
    block_retention: 720h  # 30 days

storage:
  trace:
    backend: s3
    s3:
      bucket: tempo-traces
      endpoint: s3.amazonaws.com

overrides:
  metrics_generator_processors: [service-graphs, span-metrics]
```

The basic configuration above prepares Tempo to receive traces and store them in S3.

## Configuring the Tail Sampling Processor

Tail sampling runs in the OpenTelemetry Collector that sits in front of Tempo, not in Tempo itself.

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

  # Tail sampling configuration
  tail_sampling:
    # How long to wait for all spans in a trace
    decision_wait: 30s
    # Number of traces to keep in memory
    num_traces: 100000
    # Expected new traces per second
    expected_new_traces_per_sec: 1000

    policies:
      # Keep all traces with errors
      - name: error-traces
        type: status_code
        status_code:
          status_codes: [ERROR]

      # Keep slow traces (>2 seconds)
      - name: slow-traces
        type: latency
        latency:
          threshold_ms: 2000

      # Keep specific service traces
      - name: checkout-service
        type: string_attribute
        string_attribute:
          key: service.name
          values: [checkout-service, payment-service]

      # Sample normal traces at 10%
      - name: probabilistic-policy
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

exporters:
  otlp:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp]
```

This configuration keeps all error traces and slow requests while only sampling 10% of normal traffic.

## Implementing Complex Sampling Policies

Combine multiple conditions to create sophisticated sampling logic.

```yaml
# otel-collector-config.yaml - advanced policies
processors:
  tail_sampling:
    decision_wait: 30s
    num_traces: 100000
    expected_new_traces_per_sec: 1000

    policies:
      # Keep traces with errors AND specific service
      - name: critical-service-errors
        type: and
        and:
          and_sub_policy:
            - name: error-check
              type: status_code
              status_code:
                status_codes: [ERROR]
            - name: service-check
              type: string_attribute
              string_attribute:
                key: service.name
                values: [api-gateway, auth-service]

      # Keep traces with high latency OR errors
      - name: slow-or-error
        type: or
        or:
          or_sub_policy:
            - name: latency-check
              type: latency
              latency:
                threshold_ms: 3000
            - name: error-check
              type: status_code
              status_code:
                status_codes: [ERROR]

      # Keep traces with specific attributes
      - name: important-customers
        type: string_attribute
        string_attribute:
          key: customer.tier
          values: [premium, enterprise]
          enabled_regex_matching: false
          invert_match: false

      # Rate limit specific services
      - name: rate-limit-background
        type: rate_limiting
        rate_limiting:
          spans_per_second: 100
```

These policies give you fine-grained control over which traces to keep based on your specific needs.

## Handling Trace Completion

Tail sampling needs complete traces to make decisions. Configure appropriate wait times for your trace duration distribution.

```yaml
processors:
  tail_sampling:
    # Traces taking longer than this are sampled based on partial data
    decision_wait: 30s

    # For long-running traces, make decision on partial spans
    decision_cache:
      sampled_cache_size: 50000
```

If traces regularly take longer than `decision_wait`, you'll make sampling decisions on incomplete data, potentially missing important characteristics.

## Monitoring Tail Sampling Performance

Track tail sampling metrics to ensure it's working correctly and not overwhelming your collector.

```promql
# Traces evaluated per second
rate(otelcol_processor_tail_sampling_trace_evaluated[1m])

# Sampling decisions by policy
sum by (policy) (
  rate(otelcol_processor_tail_sampling_policy_decision[1m])
)

# Late arriving spans (arrived after decision)
rate(otelcol_processor_tail_sampling_late_span_age[1m])

# Memory usage for buffered traces
otelcol_processor_tail_sampling_trace_on_memory
```

High numbers of late-arriving spans indicate you need to increase `decision_wait` or investigate why spans arrive out of order.

## Scaling Tail Sampling

For high-volume environments, run multiple collector instances with consistent hash load balancing.

```yaml
# otel-collector-config.yaml
processors:
  # Load balancer sends traces with same ID to same collector
  loadbalancing:
    routing_key: "traceID"
    protocol:
      otlp:
        timeout: 1s
    resolver:
      static:
        hostnames:
          - collector-0.collectors:4317
          - collector-1.collectors:4317
          - collector-2.collectors:4317

  tail_sampling:
    decision_wait: 30s
    num_traces: 50000
    expected_new_traces_per_sec: 500

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [loadbalancing, tail_sampling, batch]
      exporters: [otlp]
```

Load balancing ensures all spans from a trace go to the same collector instance, so the complete trace is available for evaluation.

## Combining Head and Tail Sampling

Use head-based sampling upstream to reduce the volume of traces reaching tail sampling.

```yaml
# Application instrumentation config
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.5  # Keep 50% at head

# Then tail sampling refines further
processors:
  tail_sampling:
    policies:
      # Keep 100% of errors that made it through head sampling
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]

      # Sample 20% of successful traces (combined: 50% * 20% = 10% overall)
      - name: probabilistic
        type: probabilistic
        probabilistic:
          sampling_percentage: 20
```

This two-stage approach reduces data volume early while still making intelligent decisions about which traces to keep.

## Implementing Custom Sampling Logic

Create policies based on numeric attributes for application-specific decisions.

```yaml
processors:
  tail_sampling:
    policies:
      # Keep traces with high transaction values
      - name: high-value-transactions
        type: numeric_attribute
        numeric_attribute:
          key: transaction.amount
          min_value: 10000
          max_value: 999999999

      # Keep traces from specific API versions
      - name: new-api-version
        type: string_attribute
        string_attribute:
          key: http.api.version
          values: ["v2", "v3"]

      # Keep traces hitting specific endpoints
      - name: critical-endpoints
        type: string_attribute
        string_attribute:
          key: http.route
          values: ["/checkout", "/payment"]
          enabled_regex_matching: true
          cache_max_size: 1000
```

These attribute-based policies let you prioritize business-critical transactions.

## Handling Multi-Tenant Scenarios

Apply different sampling policies per tenant using attribute-based routing.

```yaml
processors:
  tail_sampling:
    policies:
      # Premium tenants - keep more traces
      - name: premium-tenant-sampling
        type: and
        and:
          and_sub_policy:
            - name: tenant-check
              type: string_attribute
              string_attribute:
                key: tenant.tier
                values: [premium]
            - name: sampling
              type: probabilistic
              probabilistic:
                sampling_percentage: 50

      # Standard tenants - keep fewer traces
      - name: standard-tenant-sampling
        type: and
        and:
          and_sub_policy:
            - name: tenant-check
              type: string_attribute
              string_attribute:
                key: tenant.tier
                values: [standard]
            - name: sampling
              type: probabilistic
              probabilistic:
                sampling_percentage: 10
```

This gives premium customers better observability while controlling costs for standard tiers.

## Debugging Sampling Decisions

Enable debug logging to understand why traces are sampled or dropped.

```yaml
# otel-collector-config.yaml
service:
  telemetry:
    logs:
      level: debug
      development: true
      encoding: json

processors:
  tail_sampling:
    decision_wait: 30s
    num_traces: 100000
    # Enable decision logging
    decision_cache:
      sampled_cache_size: 10000
```

Debug logs show which policy matched each trace, helping you tune your configuration.

## Optimizing Memory Usage

Tail sampling buffers complete traces in memory. Size your collectors appropriately.

```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          resources:
            requests:
              memory: 4Gi
              cpu: 2000m
            limits:
              memory: 8Gi
              cpu: 4000m
          env:
            - name: GOMEMLIMIT
              value: "7GiB"
```

Calculate memory needs based on: `num_traces * average_spans_per_trace * bytes_per_span`. Budget at least 2-4GB for collectors handling tail sampling.

## Best Practices for Tail Sampling

Set `decision_wait` to at least the 99th percentile of your trace duration. Check your Tempo query results to find this value.

Start with simple policies and add complexity only when needed. Complex policies consume more CPU and memory.

Always include a catch-all probabilistic policy at the end to sample traces that don't match specific rules.

Monitor your sampling rates per policy to ensure you're getting the traces you expect. Adjust thresholds if important traces are being dropped.

Use regex matching sparingly as it's CPU-intensive. Exact string matching is much faster.

Keep error traces always. The small storage cost is worth having complete data for troubleshooting.

Test sampling policies in staging before production. Incorrect configuration can drop important traces or keep too many.

Tail-based sampling transforms tracing from a game of chance into intelligent data collection. By keeping traces that matter and discarding noise, you get better observability without overwhelming your storage or your engineers.
