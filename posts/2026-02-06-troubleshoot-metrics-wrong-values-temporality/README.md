# How to Troubleshoot Metrics Showing Wrong Values After Switching Between Delta and Cumulative Temporality

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Metrics, Temporality, OTLP

Description: Fix incorrect metric values that appear after switching between delta and cumulative aggregation temporality in OpenTelemetry.

You changed the aggregation temporality setting in your OpenTelemetry exporter, and now your metrics show wildly incorrect values. Counters that should show a steady rate suddenly spike to millions, or histograms show zero where there should be data. The mismatch between what the SDK sends and what the backend expects is the root cause.

## Understanding Aggregation Temporality

OpenTelemetry metrics support two temporality modes:

**Cumulative**: Each data point contains the total accumulated value since the process started. The backend calculates rates by computing the difference between consecutive points.

```
Time:   T1    T2    T3    T4
Value:  10    25    40    55    <- Always increasing
Rate:   -     15    15    15    <- Backend computes this
```

**Delta**: Each data point contains only the change since the last report. The backend uses the value directly.

```
Time:   T1    T2    T3    T4
Value:  10    15    15    15    <- Each point is the delta
Rate:   10    15    15    15    <- Value IS the rate
```

## What Goes Wrong

### Sending Cumulative to a Delta-Expecting Backend

If you send cumulative values to a backend that expects delta, the backend interprets each cumulative value as a delta. Your counter that went from 10 to 25 looks like 25 new requests instead of 15:

```
SDK sends (cumulative):   10    25    40
Backend interprets (delta): 10    25    40  <- WAY too high!
Actual rate should be:      10    15    15
```

### Sending Delta to a Cumulative-Expecting Backend

Prometheus expects cumulative metrics. If you send delta values, Prometheus sees what looks like a counter reset on every scrape:

```
SDK sends (delta):          15    15    15
Prometheus interprets:      15 -> 15 (reset?) -> 15 (reset?)
                           Treats each as a new counter starting from scratch
```

## Diagnosing the Mismatch

```bash
# Check what temporality your exporter is configured for
kubectl exec -it otel-collector-pod -- env | grep -i temporal

# Check the Collector configuration
kubectl get configmap otel-collector-config -o yaml | grep -i temporal
```

Check the SDK configuration:

```bash
# Environment variable that controls temporality
echo $OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE
# Values: cumulative, delta, lowmemory
```

## Fix 1: Match Temporality to Your Backend

Different backends expect different temporality:

| Backend | Expected Temporality |
|---------|---------------------|
| Prometheus | Cumulative |
| OTLP/gRPC backend | Usually both (check docs) |
| Datadog | Delta |
| New Relic | Delta or Cumulative |
| Splunk | Cumulative |

Configure the SDK:

```bash
# For Prometheus-compatible backends
export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE="cumulative"

# For backends that prefer delta
export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE="delta"
```

## Fix 2: Configure Temporality in the SDK

For Python:

```python
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.metrics.export import AggregationTemporality

# For Prometheus-style backends (cumulative)
exporter = OTLPMetricExporter(
    endpoint="http://otel-collector:4317",
    preferred_temporality={
        Counter: AggregationTemporality.CUMULATIVE,
        UpDownCounter: AggregationTemporality.CUMULATIVE,
        Histogram: AggregationTemporality.CUMULATIVE,
    }
)

# For delta-preferring backends
exporter = OTLPMetricExporter(
    endpoint="http://otel-collector:4317",
    preferred_temporality={
        Counter: AggregationTemporality.DELTA,
        UpDownCounter: AggregationTemporality.CUMULATIVE,  # UpDownCounter is always cumulative
        Histogram: AggregationTemporality.DELTA,
    }
)
```

For Go:

```go
import (
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    "go.opentelemetry.io/otel/sdk/metric"
)

exporter, err := otlpmetricgrpc.New(ctx,
    otlpmetricgrpc.WithEndpoint("otel-collector:4317"),
    otlpmetricgrpc.WithInsecure(),
    otlpmetricgrpc.WithTemporalitySelector(
        func(kind metric.InstrumentKind) metric.Temporality {
            switch kind {
            case metric.InstrumentKindCounter,
                 metric.InstrumentKindHistogram:
                return metric.TemporalityCumulative
            default:
                return metric.TemporalityCumulative
            }
        },
    ),
)
```

## Fix 3: Convert Temporality in the Collector

The Collector's `cumulativetodelta` or `deltatocumulative` processors can convert between temporalities:

```yaml
# Convert cumulative to delta
processors:
  cumulativetodelta:
    include:
      match_type: strict
      metrics:
        - http.server.request.duration
        - http.server.active_requests

# Convert delta to cumulative
processors:
  deltatocumulative:
    max_stale: 5m  # How long to remember a series
    max_streams: 10000  # Maximum number of metric streams to track
```

Use these processors in your pipeline:

```yaml
service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [cumulativetodelta, batch]  # Convert before exporting
      exporters: [otlp]
```

## Fix 4: Handle the Transition Period

When you switch temporality, there will be a transition period where the old data (in the old temporality) and the new data (in the new temporality) overlap. This can cause spikes or dips.

```bash
# Option 1: Restart all application instances simultaneously
# This creates a clean break in the metric streams

# Option 2: Accept a brief period of incorrect data
# Mark the transition time in your dashboards so you know to ignore it

# Option 3: Use a separate metric pipeline during transition
```

## Verifying Correct Temporality

```yaml
# Use the debug exporter to inspect metric temporality
exporters:
  debug:
    verbosity: detailed

# In the output, look for:
# AggregationTemporality: Cumulative
# or
# AggregationTemporality: Delta
```

```bash
# Check the Collector's output
kubectl logs -n observability deployment/otel-collector | grep -i "temporality"
```

Temporality mismatches produce some of the most confusing metric problems because the values look plausible but are wrong by orders of magnitude. Always verify that the SDK's temporality setting matches what your backend expects, and use the Collector's conversion processors if you need to bridge the gap.
