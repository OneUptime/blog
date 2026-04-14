# How to Sample Traces Efficiently in Dapr Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Tracing, Sampling, OpenTelemetry, Production, Performance

Description: Learn head-based and tail-based sampling strategies for Dapr production tracing to balance observability coverage with cost and performance overhead.

---

## The Sampling Challenge in Production

At high request rates, recording every trace is cost-prohibitive and adds latency. A service handling 10,000 req/s with 1-second average trace duration would generate millions of spans per minute. Sampling reduces this volume while preserving actionable signal - especially for errors and slow requests.

## Head-Based Sampling in Dapr

Dapr's `samplingRate` setting applies probabilistic head-based sampling at the sidecar level:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-production-tracing
  namespace: default
spec:
  tracing:
    samplingRate: "0.01"
    otel:
      endpointAddress: "otel-collector.monitoring:4317"
      isSecure: false
      protocol: grpc
```

The value `"0.01"` samples 1% of requests. Set to `"1"` for 100% and `"0"` to disable.

## Tail-Based Sampling at the Collector

Head-based sampling discards error traces randomly. Tail sampling makes decisions after seeing the full trace:

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    expected_new_traces_per_sec: 1000
    policies:
      # Always keep error traces
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]

      # Always keep slow traces (>500ms)
      - name: slow-traces
        type: latency
        latency:
          threshold_ms: 500

      # Keep 5% of healthy fast traces
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 5

      # Keep traces with specific attributes
      - name: high-value-users
        type: string_attribute
        string_attribute:
          key: user.tier
          values: [premium, enterprise]
```

## Combining Head and Tail Sampling

Set head-based rate to 100% and apply tail sampling at the collector:

```yaml
# Dapr config - send everything to collector
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring:4317"
```

```yaml
# Collector - tail sample before exporting
processors:
  tail_sampling:
    decision_wait: 15s
    policies:
      - name: errors
        type: status_code
        status_code: {status_codes: [ERROR]}
      - name: slow
        type: latency
        latency: {threshold_ms: 300}
      - name: sampled
        type: probabilistic
        probabilistic: {sampling_percentage: 2}
```

## Adaptive Sampling by Service

Different services have different traffic patterns. Use separate Dapr configurations:

```yaml
# High-traffic frontend - 0.1% head sampling
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: high-traffic-tracing
spec:
  tracing:
    samplingRate: "0.001"
---
# Low-traffic payment service - 100% sampling
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: critical-service-tracing
spec:
  tracing:
    samplingRate: "1"
```

## Estimating Collector Memory for Tail Sampling

The tail sampler holds spans in memory during `decision_wait`:

```bash
# Estimate: requests_per_sec * avg_spans_per_trace * decision_wait_seconds * bytes_per_span
# Example: 5000 req/s * 10 spans * 15s * 1KB = ~750MB
# Set collector memory limit accordingly:
resources:
  limits:
    memory: "1Gi"
```

## Verifying Sample Rates

```bash
# Check how many spans are being exported
kubectl logs -n monitoring deployment/otel-collector | \
  grep "TracesExporter" | tail -20

# Prometheus metrics for accepted vs dropped spans (from OTel Collector)
# otelcol_processor_tail_sampling_count_traces_sampled
# otelcol_processor_tail_sampling_count_spans_sampled
# otelcol_exporter_sent_spans
```

## Summary

Efficient Dapr production sampling combines a low head-based rate at the sidecar (`samplingRate: "0.01"`) with tail-based policies at the OpenTelemetry Collector that guarantee 100% retention of errors and slow traces. For critical low-traffic services like payment processing, use 100% head sampling with only tail filtering. Size the collector's memory to accommodate `requests_per_second * decision_wait_seconds * spans_per_trace` during the tail sampling window.
