# How to Reduce Trace Data Volume in Production Dapr Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Tracing, Sampling, Cost Optimization, Observability, Production, Microservice

Description: Reduce trace data volume and backend costs in production Dapr deployments using head-based sampling, tail sampling, and span filtering strategies.

---

## Overview

In a production system processing thousands of requests per second, tracing every request generates enormous amounts of data. A single Dapr service invocation can produce 10+ spans, and at 1000 req/sec across 10 services, that is 100,000+ spans per second. This guide covers practical strategies to reduce trace volume while maintaining observability quality.

## Understanding Trace Volume

Estimate your trace volume:

```text
Request rate: 1000 req/s
Services per request: 5
Spans per service: 2 (one each sidecar)
Total spans/sec: 10,000
Span size: ~1 KB
Data rate: 10 MB/s
Daily volume: ~864 GB
```

Reducing sampling to 1% cuts this to 8.64 GB/day.

## Strategy 1: Head-Based Sampling in Dapr

The simplest approach - sample a fraction of all traces:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: prod-tracing
  namespace: production
spec:
  tracing:
    samplingRate: "0.01"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
      isSecure: false
      protocol: grpc
```

Drawback: You may miss the 1% of traces that contain errors.

## Strategy 2: Tail-Based Sampling (Recommended)

Keep all error traces and slow traces, sample the rest:

```yaml
# OTel Collector config with tail sampling
processors:
  tail_sampling:
    decision_wait: 30s
    num_traces: 50000
    expected_new_traces_per_sec: 1000
    policies:
      # Always keep error traces
      - name: keep-errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      # Always keep slow traces (>500ms)
      - name: keep-slow
        type: latency
        latency:
          threshold_ms: 500
      # Sample 1% of everything else
      - name: probabilistic-remainder
        type: probabilistic
        probabilistic:
          sampling_percentage: 1
```

With this approach, set `samplingRate: "1"` in Dapr - the collector decides what to keep.

```yaml
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
```

## Strategy 3: Filter Health Check Traces

Health checks generate many traces with zero diagnostic value:

```yaml
processors:
  filter/health:
    error_mode: ignore
    traces:
      span:
        - 'name == "/healthz"'
        - 'name == "/readyz"'
        - 'name == "/livez"'
        - 'name == "dapr/config"'
```

## Strategy 4: Reduce Span Attributes

Trim large or unnecessary span attributes:

```yaml
processors:
  attributes/remove-bodies:
    actions:
      # Remove large HTTP body attributes
      - key: http.request.body
        action: delete
      - key: http.response.body
        action: delete
  transform/truncate:
    trace_statements:
      - context: span
        statements:
          # Truncate all span attribute values to 200 characters
          - truncate_all(attributes, 200)
```

## Strategy 5: Per-Service Sampling Rates

High-frequency services need lower sampling rates than low-frequency ones:

```yaml
# High frequency service (API gateway) - 0.1% sampling
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: gateway-tracing
spec:
  tracing:
    samplingRate: "0.001"
---
# Low frequency service (batch processor) - 100% sampling
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: batch-tracing
spec:
  tracing:
    samplingRate: "1"
```

## Strategy 6: Collector Batching

Efficient batching reduces network overhead:

```yaml
processors:
  batch:
    timeout: 10s
    send_batch_size: 2000
    send_batch_max_size: 5000
```

## Measuring Impact

```bash
# Monitor collector throughput
kubectl port-forward -n monitoring svc/otel-collector 8888:8888
curl http://localhost:8888/metrics | grep otelcol_exporter_sent_spans

# Before and after comparison
# Before: 10000 spans/sec
# After tail sampling: 100 spans/sec (errors) + 90 spans/sec (slow) + 98 spans/sec (1% sampled)
# Net reduction: ~97%
```

## Estimating Storage Savings

| Strategy | Reduction | Trade-off |
|---|---|---|
| 1% head sampling | 99% | Misses error traces |
| Tail sampling (keep errors + slow) | 95-99% | Slightly higher CPU |
| Health check filtering | 10-20% | No trade-off |
| Attribute trimming | 20-40% | Less context per span |

## Summary

Reduce Dapr trace data volume by combining tail-based sampling (keeping all errors and slow traces), health check filtering, and per-service sampling rates tuned to traffic volume. Set `samplingRate: "1"` in Dapr and implement sampling decisions in the OTel Collector for more intelligent filtering. This approach can reduce trace storage by 95-99% while preserving full traces for all requests that matter.
