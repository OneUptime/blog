# How to Configure Trace Sampling Rate in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Tracing, Sampling, Observability, Performance, Microservice

Description: Configure Dapr's trace sampling rate to balance observability coverage against backend storage costs and performance overhead in production.

---

## Overview

Tracing every request in a high-throughput system can overwhelm your tracing backend and add latency. Dapr's sampling rate configuration controls what fraction of requests are traced. Understanding the tradeoffs between sampling strategies helps you maintain observability without breaking the bank or degrading performance.

## How Dapr Sampling Works

Dapr uses the `samplingRate` field in the `Configuration` resource to set the probability of sampling a new trace. The value is a string from `"0"` (no sampling) to `"1"` (sample everything).

- `"1"` = 100% - trace every request
- `"0.1"` = 10% - trace 1 in 10 requests
- `"0.01"` = 1% - trace 1 in 100 requests
- `"0"` = 0% - disable tracing

## Basic Sampling Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-tracing
  namespace: default
spec:
  tracing:
    samplingRate: "0.1"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
      isSecure: false
      protocol: grpc
```

## Sampling Strategies by Environment

### Development - Sample Everything

```yaml
spec:
  tracing:
    samplingRate: "1"
```

### Staging - High Sampling

```yaml
spec:
  tracing:
    samplingRate: "0.5"
```

### Production (Low Traffic) - Moderate Sampling

```yaml
spec:
  tracing:
    samplingRate: "0.1"
```

### Production (High Traffic) - Low Sampling

```yaml
spec:
  tracing:
    samplingRate: "0.01"
```

## Per-Namespace Sampling

Use different configurations for different namespaces:

```bash
# Development namespace - 100% sampling
kubectl apply -f dapr-config-dev.yaml -n development

# Production namespace - 1% sampling
kubectl apply -f dapr-config-prod.yaml -n production
```

Each configuration is scoped to a namespace. Reference the correct configuration per deployment.

## Head-Based vs Tail-Based Sampling

Dapr uses head-based sampling (the decision is made when the trace starts). For tail-based sampling (keep only slow or erroneous traces), use the OpenTelemetry Collector's tail sampling processor:

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100
    expected_new_traces_per_sec: 10
    policies:
      - name: errors-policy
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: slow-traces-policy
        type: latency
        latency:
          threshold_ms: 500
      - name: probabilistic-policy
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
```

With this approach, set `samplingRate: "1"` in Dapr and let the collector make sampling decisions.

## Estimating Backend Storage Requirements

At 1000 requests/second with 5 services and a 10-span average:

```text
Requests/sec: 1000
Sampling rate: 0.1 (10%)
Sampled traces/sec: 100
Spans per trace: 10 (5 services x 2 spans each)
Spans/sec stored: 1000
Span size: ~1KB
Storage/hour: ~3.6 GB
Storage/day: ~86 GB
```

Adjust `samplingRate` to fit your storage budget.

## Forcing Sampling for Specific Requests

Override Dapr's sampling decision by setting the `traceparent` flags:

```bash
# Force sampling (flags byte = 01)
curl -X POST http://localhost:3500/v1.0/invoke/order-service/method/create \
  -H "traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01" \
  -d '{"debug": true}'

# Force not sampled (flags byte = 00)
curl -X POST http://localhost:3500/v1.0/invoke/order-service/method/create \
  -H "traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00" \
  -d '{}'
```

## Monitoring Sampling Effectiveness

Track sampling rates in your OTel Collector:

```yaml
exporters:
  prometheus:
    endpoint: 0.0.0.0:8889

service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
```

Then query:

```text
otelcol_processor_tail_sampling_count_traces_sampled{sampled="true"}
otelcol_processor_tail_sampling_count_traces_sampled{sampled="false"}
```

## Summary

Set `samplingRate: "1"` in development for full visibility and reduce to `"0.1"` or lower in production to manage costs. For intelligent sampling that keeps all errors and slow traces, use `samplingRate: "1"` in Dapr combined with the OTel Collector's tail sampling processor. This gives you the best of both worlds: cost control and full coverage of problematic requests.
