# How to Configure Metric Views to Override Default Histogram Bucket Boundaries in the OpenTelemetry SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Metrics, Histogram, Views

Description: Configure OpenTelemetry SDK metric views to override default histogram bucket boundaries for better resolution in your latency distributions.

The default histogram bucket boundaries in the OpenTelemetry SDK are designed for general use: `[0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000]`. These work for some workloads but are a poor fit for others. If your HTTP service responds in 1-50 milliseconds, most of your data lands in just two or three buckets, giving you terrible resolution. Metric Views let you override these boundaries per instrument or per instrument type.

## What Metric Views Do

A View is a configuration rule that modifies how the SDK aggregates metric data. You can use Views to:

- Change histogram bucket boundaries
- Rename instruments
- Change the aggregation type (e.g., turn a histogram into a sum)
- Drop unwanted instruments entirely
- Filter attribute keys

## Python: Custom Histogram Buckets

```python
# metrics_setup.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.metrics.view import View, ExplicitBucketHistogramAggregation
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Define custom bucket boundaries for HTTP latency
# Focused on the 1-100ms range where most responses fall
http_latency_buckets = [1, 2, 5, 10, 15, 20, 30, 50, 75, 100, 200, 500, 1000, 5000]

# View that applies custom buckets to any histogram matching "http.server.duration"
http_latency_view = View(
    instrument_name="http.server.duration",
    aggregation=ExplicitBucketHistogramAggregation(
        boundaries=http_latency_buckets
    ),
)

# View for database query latency with different bucket boundaries
db_latency_buckets = [0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000]

db_latency_view = View(
    instrument_name="db.client.duration",
    aggregation=ExplicitBucketHistogramAggregation(
        boundaries=db_latency_buckets
    ),
)

# View for message queue processing time
queue_latency_buckets = [10, 50, 100, 500, 1000, 5000, 10000, 30000, 60000]

queue_view = View(
    instrument_name="messaging.process.duration",
    aggregation=ExplicitBucketHistogramAggregation(
        boundaries=queue_latency_buckets
    ),
)

# Set up the MeterProvider with all views
exporter = OTLPMetricExporter(endpoint="http://collector:4317", insecure=True)
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=15000)

provider = MeterProvider(
    metric_readers=[reader],
    views=[http_latency_view, db_latency_view, queue_view],
)
metrics.set_meter_provider(provider)
```

## Wildcard Matching for Views

You can use wildcard patterns to match multiple instruments:

```python
from opentelemetry.sdk.metrics.view import View, ExplicitBucketHistogramAggregation

# Apply custom buckets to ALL histograms matching a pattern
# The * wildcard matches any characters
latency_view = View(
    instrument_name="*.duration",
    aggregation=ExplicitBucketHistogramAggregation(
        boundaries=[1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000]
    ),
)

# Apply to all histograms from a specific meter (library)
http_view = View(
    instrument_name="*",
    meter_name="opentelemetry.instrumentation.flask",
    aggregation=ExplicitBucketHistogramAggregation(
        boundaries=[1, 5, 10, 25, 50, 100, 250, 500, 1000]
    ),
)
```

## Java: Views in the SDK

```java
import io.opentelemetry.sdk.metrics.SdkMeterProvider;
import io.opentelemetry.sdk.metrics.InstrumentSelector;
import io.opentelemetry.sdk.metrics.View;
import io.opentelemetry.sdk.metrics.Aggregation;
import io.opentelemetry.sdk.metrics.export.PeriodicMetricReader;
import io.opentelemetry.exporter.otlp.metrics.OtlpGrpcMetricExporter;

import java.time.Duration;
import java.util.List;

SdkMeterProvider meterProvider = SdkMeterProvider.builder()
    // Custom buckets for HTTP server latency
    .registerView(
        InstrumentSelector.builder()
            .setName("http.server.duration")
            .build(),
        View.builder()
            .setAggregation(Aggregation.explicitBucketHistogram(
                List.of(1.0, 2.0, 5.0, 10.0, 20.0, 50.0, 100.0, 200.0, 500.0, 1000.0)
            ))
            .build()
    )
    // Custom buckets for database operations
    .registerView(
        InstrumentSelector.builder()
            .setName("db.client.operation.duration")
            .build(),
        View.builder()
            .setAggregation(Aggregation.explicitBucketHistogram(
                List.of(0.5, 1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 500.0, 1000.0)
            ))
            .build()
    )
    .registerMetricReader(
        PeriodicMetricReader.builder(
            OtlpGrpcMetricExporter.builder()
                .setEndpoint("http://collector:4317")
                .build()
        ).setInterval(Duration.ofSeconds(15)).build()
    )
    .build();
```

## Go: Views Configuration

```go
package main

import (
    "go.opentelemetry.io/otel/sdk/metric"
)

func setupViews() []metric.Option {
    return []metric.Option{
        // Custom histogram boundaries for HTTP latency
        metric.WithView(
            metric.NewView(
                metric.Instrument{Name: "http.server.duration"},
                metric.Stream{
                    Aggregation: metric.AggregationExplicitBucketHistogram{
                        Boundaries: []float64{
                            1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 5000,
                        },
                    },
                },
            ),
        ),
    }
}
```

## Choosing Bucket Boundaries

Follow these guidelines:

1. **Cover your expected range.** If p99 latency is 200ms, your highest bucket should be above that (maybe 500ms or 1000ms for outliers).

2. **More buckets in the critical range.** If your SLO is p95 < 50ms, add more buckets between 0-50ms: `[1, 2, 5, 10, 15, 20, 25, 30, 40, 50, 100, 250, 500]`.

3. **Fewer buckets at the extremes.** You do not need fine resolution above your p99.

4. **Keep total bucket count reasonable.** Each bucket creates a time series. 10-20 buckets is typical. Going above 30 starts to impact performance and storage.

```python
# Example: SLO-focused bucket selection
# SLO: p95 < 100ms, p99 < 500ms
# Fine resolution: 0-100ms (where SLO is measured)
# Coarse resolution: 100ms+ (just for outlier tracking)
slo_buckets = [5, 10, 20, 30, 50, 75, 100, 150, 250, 500, 1000, 5000]
```

## Dropping Instruments with Views

Views can also drop instruments you do not need, reducing metric cardinality:

```python
from opentelemetry.sdk.metrics.view import View, DropAggregation

# Drop a noisy instrument entirely
drop_view = View(
    instrument_name="http.client.request.size",
    aggregation=DropAggregation(),
)
```

Metric Views are one of the most powerful configuration options in the OpenTelemetry SDK. Custom histogram buckets aligned to your service's latency profile give you meaningful percentile calculations, while the default boundaries often put 90% of your data in a single bucket.
