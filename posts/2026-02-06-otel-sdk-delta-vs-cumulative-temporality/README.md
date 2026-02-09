# How to Configure the OpenTelemetry SDK to Use Delta vs Cumulative Temporality Per Metric Instrument Type

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Metrics, Temporality, SDK Configuration

Description: Configure the OpenTelemetry SDK to use delta or cumulative aggregation temporality per metric instrument type for different backends.

Aggregation temporality controls how metric data points relate to each other over time. Cumulative temporality means each data point contains the total since the process started. Delta temporality means each data point contains only the change since the last export. Different backends prefer different temporalities: Prometheus expects cumulative, while Datadog and Azure Monitor prefer delta.

## Cumulative vs Delta Explained

Consider a counter that tracks HTTP requests:

**Cumulative temporality** (monotonically increasing):
```
t=0:  total_requests = 0
t=15: total_requests = 42
t=30: total_requests = 89
t=45: total_requests = 134
```

**Delta temporality** (change per interval):
```
t=0-15:  delta_requests = 42
t=15-30: delta_requests = 47
t=30-45: delta_requests = 45
```

Both carry the same information, but the format differs. Cumulative is simpler for consumers that do rate calculations (like Prometheus's `rate()` function). Delta is simpler for consumers that sum values across instances (like Datadog).

## Python: Configuring Temporality

```python
# metrics_setup.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import (
    PeriodicExportingMetricReader,
    AggregationTemporality,
)
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter


# Configure delta temporality for Datadog-compatible backends
delta_temporality_config = {
    # Counter instruments use delta
    metrics.Counter: AggregationTemporality.DELTA,
    # UpDownCounter uses delta
    metrics.UpDownCounter: AggregationTemporality.DELTA,
    # Histogram uses delta
    metrics.Histogram: AggregationTemporality.DELTA,
    # Observable counters use delta
    metrics.ObservableCounter: AggregationTemporality.DELTA,
    metrics.ObservableUpDownCounter: AggregationTemporality.DELTA,
    metrics.ObservableGauge: AggregationTemporality.DELTA,
}

# Create exporter with delta temporality preference
exporter = OTLPMetricExporter(
    endpoint="http://collector:4317",
    insecure=True,
    preferred_temporality=delta_temporality_config,
)

reader = PeriodicExportingMetricReader(
    exporter,
    export_interval_millis=15000,
)

provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)
```

## Cumulative Temporality (Prometheus-Compatible)

```python
# For Prometheus backend - use cumulative temporality
cumulative_config = {
    metrics.Counter: AggregationTemporality.CUMULATIVE,
    metrics.UpDownCounter: AggregationTemporality.CUMULATIVE,
    metrics.Histogram: AggregationTemporality.CUMULATIVE,
    metrics.ObservableCounter: AggregationTemporality.CUMULATIVE,
    metrics.ObservableUpDownCounter: AggregationTemporality.CUMULATIVE,
    metrics.ObservableGauge: AggregationTemporality.CUMULATIVE,
}

exporter = OTLPMetricExporter(
    endpoint="http://collector:4317",
    insecure=True,
    preferred_temporality=cumulative_config,
)
```

## Mixed Temporality Per Instrument

Some advanced setups use different temporalities for different instrument types:

```python
# Mixed: delta for counters, cumulative for histograms
mixed_config = {
    # Counters work well with delta for aggregation across instances
    metrics.Counter: AggregationTemporality.DELTA,
    metrics.ObservableCounter: AggregationTemporality.DELTA,
    # Histograms work better with cumulative for percentile calculation
    metrics.Histogram: AggregationTemporality.CUMULATIVE,
    # Gauges are naturally "last value" - temporality matters less
    metrics.ObservableGauge: AggregationTemporality.CUMULATIVE,
    # UpDownCounters: delta for easier multi-instance aggregation
    metrics.UpDownCounter: AggregationTemporality.DELTA,
    metrics.ObservableUpDownCounter: AggregationTemporality.DELTA,
}
```

## Java: Temporality Configuration

```java
import io.opentelemetry.sdk.metrics.SdkMeterProvider;
import io.opentelemetry.sdk.metrics.export.PeriodicMetricReader;
import io.opentelemetry.sdk.metrics.export.AggregationTemporalitySelector;
import io.opentelemetry.exporter.otlp.metrics.OtlpGrpcMetricExporter;

import java.time.Duration;

// Delta temporality for all instruments
OtlpGrpcMetricExporter deltaExporter = OtlpGrpcMetricExporter.builder()
    .setEndpoint("http://collector:4317")
    .setAggregationTemporalitySelector(
        AggregationTemporalitySelector.deltaPreferred()
    )
    .build();

// Cumulative temporality for all instruments
OtlpGrpcMetricExporter cumulativeExporter = OtlpGrpcMetricExporter.builder()
    .setEndpoint("http://collector:4317")
    .setAggregationTemporalitySelector(
        AggregationTemporalitySelector.alwaysCumulative()
    )
    .build();

SdkMeterProvider provider = SdkMeterProvider.builder()
    .registerMetricReader(
        PeriodicMetricReader.builder(deltaExporter)
            .setInterval(Duration.ofSeconds(15))
            .build()
    )
    .build();
```

## Go: Temporality Selection

```go
package main

import (
    "context"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/metric/metricdata"
)

func setupMetrics(ctx context.Context) (*metric.MeterProvider, error) {
    exporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint("collector:4317"),
        otlpmetricgrpc.WithInsecure(),
        // Use delta temporality
        otlpmetricgrpc.WithTemporalitySelector(
            func(kind metric.InstrumentKind) metricdata.Temporality {
                switch kind {
                case metric.InstrumentKindCounter,
                    metric.InstrumentKindHistogram,
                    metric.InstrumentKindObservableCounter:
                    return metricdata.DeltaTemporality
                default:
                    return metricdata.CumulativeTemporality
                }
            },
        ),
    )
    if err != nil {
        return nil, err
    }

    mp := metric.NewMeterProvider(
        metric.WithReader(metric.NewPeriodicReader(exporter)),
    )
    return mp, nil
}
```

## Environment Variable Configuration

```bash
# Set temporality via environment variable
# Values: cumulative, delta, lowmemory
export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=delta
```

The `lowmemory` option uses delta for synchronous instruments and cumulative for asynchronous ones, which is a good default for memory-constrained environments.

## Backend Compatibility Reference

| Backend | Preferred Temporality |
|---------|----------------------|
| Prometheus | Cumulative |
| Datadog | Delta |
| New Relic | Delta |
| Azure Monitor | Delta |
| Dynatrace | Delta |
| Honeycomb | Cumulative or Delta |
| Grafana Cloud | Cumulative |
| OneUptime | Cumulative |

## When to Choose Each

Use **cumulative** when:
- Your backend is Prometheus or Prometheus-compatible
- You need simple rate calculations (just divide by time)
- You do not care about memory overhead from tracking cumulative state

Use **delta** when:
- Your backend prefers delta (Datadog, New Relic)
- You run many instances and want easy cross-instance aggregation
- You want lower memory usage in the SDK (delta resets each interval)
- You have short-lived processes where cumulative reset on restart causes issues

The temporality choice is primarily driven by your backend's preference. Configure it once and the SDK handles the aggregation math internally.
