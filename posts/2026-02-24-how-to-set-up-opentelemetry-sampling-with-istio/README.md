# How to Set Up OpenTelemetry Sampling with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OpenTelemetry, Sampling, Distributed Tracing, Kubernetes

Description: How to configure and optimize trace sampling in Istio with OpenTelemetry, covering head-based, tail-based, and custom sampling strategies.

---

Trace sampling is the practice of only recording a subset of traces rather than every single request. In a busy mesh handling thousands of requests per second, tracing everything would generate enormous amounts of data that is expensive to store and hard to search through. Good sampling gives you enough traces to understand system behavior without drowning in data. Istio and OpenTelemetry provide multiple layers of sampling control that you can tune for different workloads.

## Understanding Sampling Types

There are two fundamental approaches to sampling:

**Head-based sampling** makes the sampling decision at the start of a trace, before any work is done. The first service in the chain decides whether to sample, and that decision propagates to all downstream services. This is simple and efficient but has a major downside: you might miss interesting traces (like errors or slow requests) because the sampling decision was made before the outcome was known.

**Tail-based sampling** waits until a trace is complete, then decides whether to keep it based on the outcome. This lets you keep all error traces, all slow traces, and randomly sample normal traces. The downside is that it requires buffering complete traces before deciding, which needs more resources.

Istio supports head-based sampling natively. For tail-based sampling, you need an OpenTelemetry Collector in between.

## Configuring Head-Based Sampling in Istio

### Mesh-Wide Sampling Rate

Set a default sampling rate for all workloads:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 1.0
    extensionProviders:
    - name: otel
      opentelemetry:
        service: otel-collector.observability.svc.cluster.local
        port: 4317
    defaultProviders:
      tracing:
      - otel
```

The `sampling` value is a percentage. 1.0 means 1% of requests are traced. For a service handling 10,000 requests per second, that's 100 traces per second, which is usually plenty for understanding system behavior.

### Per-Namespace Sampling

Use the Telemetry API to set different rates per namespace:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: production-sampling
  namespace: production
spec:
  tracing:
  - providers:
    - name: otel
    randomSamplingPercentage: 0.5
---
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: staging-sampling
  namespace: staging
spec:
  tracing:
  - providers:
    - name: otel
    randomSamplingPercentage: 100.0
```

Staging gets 100% sampling for full visibility during testing. Production gets 0.5% to keep costs down.

### Per-Workload Sampling

Target specific workloads with label selectors:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: critical-service-sampling
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-gateway
  tracing:
  - providers:
    - name: otel
    randomSamplingPercentage: 20.0
```

The payment gateway gets sampled at 20% even though the rest of production is at 0.5%. This makes sense for services where you want more visibility.

## How Head-Based Sampling Propagates

When the first service in a trace chain makes a sampling decision, it encodes that decision in the trace context headers. Here is what happens:

1. Request arrives at Service A
2. The Envoy proxy rolls a random number against the sampling rate
3. If sampled, the proxy sets the `sampled` flag in the `traceparent` header
4. Service A calls Service B, passing the headers
5. Service B's proxy sees the `sampled` flag and traces its span too
6. This continues through the entire call chain

This means the sampling rate of the first service in the chain determines whether the entire trace is captured. If Service A is sampled at 1% but Service B is sampled at 100%, only 1% of traces through both services will be captured (because the decision is made at Service A).

## Setting Up Tail-Based Sampling

Tail-based sampling requires the OpenTelemetry Collector with the `tail_sampling` processor:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317

    processors:
      memory_limiter:
        check_interval: 5s
        limit_mib: 1024
        spike_limit_mib: 256

      tail_sampling:
        decision_wait: 15s
        num_traces: 100000
        expected_new_traces_per_sec: 1000
        policies:
        - name: always-sample-errors
          type: status_code
          status_code:
            status_codes:
            - ERROR

        - name: always-sample-slow
          type: latency
          latency:
            threshold_ms: 2000

        - name: sample-by-service
          type: string_attribute
          string_attribute:
            key: service.name
            values:
            - payment-service
            - checkout-service

        - name: probabilistic-sample
          type: probabilistic
          probabilistic:
            sampling_percentage: 5

      batch:
        timeout: 10s
        send_batch_size: 1024

    exporters:
      otlp:
        endpoint: "tempo.observability:4317"
        tls:
          insecure: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, tail_sampling, batch]
          exporters: [otlp]
```

### Understanding Tail Sampling Configuration

- `decision_wait: 15s` - the collector waits 15 seconds for all spans of a trace to arrive before deciding. This needs to be longer than your longest request chain.
- `num_traces: 100000` - maximum number of traces to buffer while waiting for decisions. Increase this for higher-traffic systems.
- `expected_new_traces_per_sec: 1000` - helps the collector pre-allocate memory.

### Sampling Policies

The policies are evaluated in order and combined with an OR logic (any matching policy keeps the trace):

**Always keep errors:**

```yaml
- name: always-sample-errors
  type: status_code
  status_code:
    status_codes:
    - ERROR
```

Every trace that contains an error span is kept. This is the most important policy because errors are exactly the traces you want to investigate.

**Keep slow traces:**

```yaml
- name: always-sample-slow
  type: latency
  latency:
    threshold_ms: 2000
```

Any trace that takes more than 2 seconds end-to-end is kept. Slow traces often indicate problems.

**Keep specific services:**

```yaml
- name: critical-services
  type: string_attribute
  string_attribute:
    key: service.name
    values:
    - payment-service
```

Always sample traces that involve the payment service.

**Random sample the rest:**

```yaml
- name: probabilistic-sample
  type: probabilistic
  probabilistic:
    sampling_percentage: 5
```

5% of remaining traces are kept for baseline visibility.

## Combining Head and Tail Sampling

The most effective strategy uses both:

1. Set Istio head-based sampling to a moderate rate (like 10-20%)
2. Use the collector's tail-based sampling to further refine what gets kept

```yaml
# Istio: send 20% of traces to the collector
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-sampling
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel
    randomSamplingPercentage: 20.0
```

```yaml
# Collector: from that 20%, keep errors, slow, and 5% random
processors:
  tail_sampling:
    policies:
    - name: errors
      type: status_code
      status_code:
        status_codes: [ERROR]
    - name: slow
      type: latency
      latency:
        threshold_ms: 1000
    - name: baseline
      type: probabilistic
      probabilistic:
        sampling_percentage: 5
```

The effective rate: 20% (head) * 5% (tail baseline) = 1% of normal traces, plus all error and slow traces within the 20% head sample.

## Monitoring Sampling Effectiveness

Track how sampling affects your trace storage:

```promql
# Spans received by the collector
rate(otelcol_receiver_accepted_spans[5m])

# Spans exported after sampling
rate(otelcol_exporter_sent_spans[5m])

# Drop rate
1 - (rate(otelcol_exporter_sent_spans[5m]) / rate(otelcol_receiver_accepted_spans[5m]))
```

## Adjusting Sampling Based on Traffic

In production, traffic patterns change throughout the day. You might want higher sampling during low-traffic periods and lower sampling during peaks:

```bash
#!/bin/bash
# Simple script to adjust sampling based on RPS

CURRENT_RPS=$(curl -s 'http://prometheus:9090/api/v1/query?query=sum(rate(istio_requests_total[5m]))' | jq -r '.data.result[0].value[1]')

if (( $(echo "$CURRENT_RPS < 100" | bc -l) )); then
  SAMPLING=50.0
elif (( $(echo "$CURRENT_RPS < 1000" | bc -l) )); then
  SAMPLING=10.0
else
  SAMPLING=1.0
fi

cat <<EOF | kubectl apply -f -
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: adaptive-sampling
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel
    randomSamplingPercentage: $SAMPLING
EOF

echo "Set sampling to $SAMPLING% (RPS: $CURRENT_RPS)"
```

## Common Sampling Mistakes

1. **Setting sampling too high in production** - 100% sampling at 10k RPS generates massive amounts of data
2. **Not sampling errors** - using only random sampling means you miss error traces
3. **Decision wait too short for tail sampling** - if traces aren't complete within the wait period, they get dropped
4. **Forgetting that head sampling is propagated** - the first service's rate determines the trace
5. **Not monitoring the pipeline** - without metrics on the collector, you won't know if data is being lost

Getting sampling right is a balancing act between cost and visibility. Start with a low head-based rate in production, add tail-based sampling to keep the important traces, and adjust as you learn what your team actually looks at when debugging issues.
