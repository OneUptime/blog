# How to implement OpenTelemetry tail sampling for intelligent trace selection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, Tracing, Collector, Observability

Description: Learn how to configure OpenTelemetry tail sampling processor in the collector to make intelligent sampling decisions based on complete trace information including errors and latency.

---

Tail sampling makes sampling decisions after traces complete, allowing intelligent selection based on actual trace characteristics like errors, latency, or specific attributes. This approach captures problematic traces while dropping routine successful requests.

## Understanding Tail Sampling

Unlike head-based sampling that decides at trace start, tail sampling waits for all spans in a trace to arrive before making a decision. This enables sampling based on complete trace information but requires more collector resources to buffer traces.

The tail sampling processor in the OpenTelemetry Collector examines completed traces and applies policies to determine which traces to keep. Common policies include sampling all errors, slow traces, or traces matching specific criteria.

## Basic Tail Sampling Configuration

Configure the tail sampling processor in the OpenTelemetry Collector to sample based on error status and latency.

```yaml
# collector-tail-sampling.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  tail_sampling:
    # Wait time for trace completion
    decision_wait: 10s
    
    # Number of traces to buffer
    num_traces: 100000
    
    # Expected new traces per second
    expected_new_traces_per_sec: 1000
    
    policies:
      # Always sample traces with errors
      - name: error-policy
        type: status_code
        status_code:
          status_codes:
            - ERROR
      
      # Sample slow traces (> 1 second)
      - name: latency-policy
        type: latency
        latency:
          threshold_ms: 1000
      
      # Sample 10% of successful traces
      - name: probabilistic-policy
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: tempo:4317
    tls:
      insecure: true
  logging:
    loglevel: info

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp, logging]
```

This configuration keeps all errors and slow traces while sampling only 10% of normal traffic.

## Error-Based Sampling

Configure policies that always sample traces containing errors or specific error types.

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    expected_new_traces_per_sec: 1000
    
    policies:
      # Sample all traces with errors
      - name: errors
        type: status_code
        status_code:
          status_codes:
            - ERROR
      
      # Sample traces with specific error attributes
      - name: payment-errors
        type: and
        and:
          and_sub_policy:
            - name: has-error
              type: status_code
              status_code:
                status_codes:
                  - ERROR
            - name: payment-service
              type: string_attribute
              string_attribute:
                key: service.name
                values:
                  - payment-service
      
      # Sample database errors
      - name: db-errors
        type: string_attribute
        string_attribute:
          key: error.type
          values:
            - DatabaseConnectionError
            - QueryTimeoutError
```

## Latency-Based Policies

Sample traces based on duration thresholds to capture slow requests.

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    expected_new_traces_per_sec: 1000
    
    policies:
      # Critical endpoints - sample if > 500ms
      - name: critical-slow
        type: and
        and:
          and_sub_policy:
            - name: critical-endpoint
              type: string_attribute
              string_attribute:
                key: http.route
                values:
                  - /api/checkout
                  - /api/payment
            - name: slow
              type: latency
              latency:
                threshold_ms: 500
      
      # Regular endpoints - sample if > 2 seconds
      - name: general-slow
        type: latency
        latency:
          threshold_ms: 2000
      
      # Very slow traces always sampled
      - name: very-slow
        type: latency
        latency:
          threshold_ms: 5000
```

## Attribute-Based Sampling

Create policies based on span attributes for business-critical operations.

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    expected_new_traces_per_sec: 1000
    
    policies:
      # Sample premium customer requests
      - name: premium-customers
        type: string_attribute
        string_attribute:
          key: customer.tier
          values:
            - premium
            - enterprise
      
      # Sample high-value transactions
      - name: high-value
        type: numeric_attribute
        numeric_attribute:
          key: transaction.amount
          min_value: 1000
      
      # Sample specific tenant
      - name: important-tenant
        type: string_attribute
        string_attribute:
          key: tenant.id
          values:
            - tenant-abc123
      
      # Sample specific user actions
      - name: critical-actions
        type: string_attribute
        string_attribute:
          key: action.type
          values:
            - password_change
            - data_export
            - account_deletion
```

## Composite Policies

Combine multiple conditions using AND and OR policies for complex sampling logic.

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    expected_new_traces_per_sec: 1000
    
    policies:
      # Sample mobile API errors
      - name: mobile-api-errors
        type: and
        and:
          and_sub_policy:
            - name: from-mobile
              type: string_attribute
              string_attribute:
                key: client.platform
                values:
                  - ios
                  - android
            - name: api-request
              type: string_attribute
              string_attribute:
                key: http.method
                values:
                  - GET
                  - POST
            - name: has-error
              type: status_code
              status_code:
                status_codes:
                  - ERROR
      
      # Sample if slow OR error
      - name: slow-or-error
        type: or
        or:
          or_sub_policy:
            - name: slow
              type: latency
              latency:
                threshold_ms: 2000
            - name: error
              type: status_code
              status_code:
                status_codes:
                  - ERROR
```

## Rate-Limited Policies

Limit sampling rate for specific trace types to prevent overwhelming the backend.

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    expected_new_traces_per_sec: 1000
    
    policies:
      # Always sample errors (unlimited)
      - name: all-errors
        type: status_code
        status_code:
          status_codes:
            - ERROR
      
      # Rate-limited sampling for normal traffic
      - name: rate-limited-success
        type: rate_limiting
        rate_limiting:
          spans_per_second: 100
      
      # Sample successful health checks at low rate
      - name: health-checks
        type: and
        and:
          and_sub_policy:
            - name: health-endpoint
              type: string_attribute
              string_attribute:
                key: http.route
                values:
                  - /health
                  - /healthz
            - name: low-rate
              type: probabilistic
              probabilistic:
                sampling_percentage: 1
```

## Multi-Tier Architecture

Deploy tail sampling in a multi-tier collector architecture for scalability.

```yaml
# First tier - gateway collectors (no tail sampling)
# gateway-collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 1s

exporters:
  loadbalancing:
    protocol:
      otlp:
        endpoint: sampling-collector-headless:4317
        tls:
          insecure: true
    resolver:
      dns:
        hostname: sampling-collector-headless
        port: 4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [loadbalancing]

---
# Second tier - sampling collectors (with tail sampling)
# sampling-collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    expected_new_traces_per_sec: 1000
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes:
            - ERROR
      - name: slow
        type: latency
        latency:
          threshold_ms: 1000
      - name: probabilistic
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

  batch:
    timeout: 10s

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

## Monitoring Tail Sampling

Monitor tail sampling processor metrics to ensure proper operation.

```yaml
# Add Prometheus exporter to sampling collector
exporters:
  prometheus:
    endpoint: 0.0.0.0:8888

service:
  telemetry:
    metrics:
      address: :8888
  
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp]

# Key metrics to monitor:
# - otelcol_processor_tail_sampling_policy_decision
# - otelcol_processor_tail_sampling_trace_late_arriving_spans
# - otelcol_processor_tail_sampling_trace_id_not_found
```

Monitor these metrics to identify issues with trace completion timeouts or memory pressure.

## Tuning Decision Wait Time

Adjust decision wait time based on your trace characteristics.

```yaml
processors:
  tail_sampling:
    # Short wait for fast services
    decision_wait: 5s  # Use for traces < 5s
    
    # Medium wait for typical services
    # decision_wait: 10s  # Use for traces < 10s
    
    # Long wait for slow services
    # decision_wait: 30s  # Use for traces < 30s
    
    num_traces: 100000
```

Longer wait times increase memory usage but reduce dropped spans from late-arriving traces.

## Best Practices

Follow these best practices when implementing tail sampling.

First, deploy tail sampling in dedicated collector instances. Tail sampling requires significant memory and CPU resources.

Second, set decision_wait based on your maximum expected trace duration. Traces taking longer than decision_wait may be dropped.

Third, monitor memory usage carefully. The num_traces setting controls memory consumption.

Fourth, use multi-tier collector architecture for high-scale deployments. Gateway collectors distribute load to sampling collectors.

Fifth, always sample errors and critical operations. These traces provide the most troubleshooting value.

Sixth, test policies in staging before production. Verify policies capture expected traces without overwhelming storage.

OpenTelemetry tail sampling enables intelligent trace selection based on complete trace information. This approach captures valuable error and latency traces while controlling overall trace volume and storage costs.
