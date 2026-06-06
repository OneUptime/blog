# How to Aggregate Metrics at the Source to Reduce Data Volume

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Metric, Aggregation, Performance, Data Volume, Optimization

Description: Reduce metric data volume and costs by implementing source-level aggregation strategies in OpenTelemetry SDKs and collectors with practical configuration examples.

Metrics are the lifeblood of observability, but raw metric data can quickly overwhelm systems. A single Kubernetes cluster with 100 pods, each emitting 50 metrics every 10 seconds, generates 30,000 data points per minute, 43 million per day, or about 1.3 billion per 30-day month.

Source-level aggregation reduces this volume by processing metrics before they leave the application or collector, lowering network bandwidth, storage costs, and query latency.

## Understanding Metric Aggregation

OpenTelemetry metrics follow a structured aggregation pipeline:

```mermaid
graph LR
    A[Instrument<br/>Counter/Gauge/Histogram] --> B[Measurement]
    B --> C[View Configuration]
    C --> D[Aggregation<br/>Sum/LastValue/Histogram]
    D --> E[Metric Reader]
    E --> F[Exporter]
    F --> G[Collector]
    G --> H[Backend]

    style C fill:#f9f,stroke:#333
    style D fill:#bbf,stroke:#333
```

Aggregation occurs at multiple stages:
1. **SDK aggregation**: In the application using Views
2. **Collector aggregation**: In the OpenTelemetry Collector
3. **Backend aggregation**: In the observability backend

Source-level aggregation (SDK and Collector) provides the greatest cost reduction by minimizing data transmission and storage.

## Metric Types and Default Aggregation

OpenTelemetry defines several metric instruments, including counters, gauges, up down counters, asynchronous instruments, and histograms. Three common synchronous instruments have these default aggregation behaviors:

**Counter**: Monotonically increasing values (requests, bytes sent)
- Default aggregation: Sum
- Example: `http.server.request_count`

**Gauge**: Current value that goes up and down (CPU usage, queue depth)
- Default aggregation: LastValue
- Example: `system.cpu.utilization`

**Histogram**: Distribution of values (request duration, response size)
- Default aggregation: ExplicitBucketHistogram
- Example: `http.server.request.duration`

```python
# Example: Creating metrics with default aggregation

from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader

# Initialize meter provider
meter_provider = MeterProvider(
    metric_readers=[
        PeriodicExportingMetricReader(exporter, export_interval_millis=60000)
    ]
)
metrics.set_meter_provider(meter_provider)

meter = metrics.get_meter(__name__)

# Counter: aggregates as sum
request_counter = meter.create_counter(
    name="http.server.request.count",
    description="Total HTTP requests",
    unit="1"
)

# Gauge: aggregates as last value
queue_gauge = meter.create_gauge(
    name="queue.depth",
    description="Current queue depth",
    unit="1"
)

# Histogram: aggregates into buckets
duration_histogram = meter.create_histogram(
    name="http.server.request.duration",
    description="HTTP request duration",
    unit="ms"
)
```

## Configuring Views for SDK-Level Aggregation

Views allow you to customize metric aggregation before export, reducing cardinality and data volume.

### Reducing Histogram Buckets

Histograms contain one count per bucket, and Prometheus-style backends often store each bucket as a separate time series. Reducing bucket count can dramatically lower exported series and storage volume.

```python
# views_config.py
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import View
from opentelemetry.sdk.metrics import Histogram
from opentelemetry.sdk.metrics.view import (
    ExplicitBucketHistogramAggregation,
)

# Define custom histogram buckets
# Default: [0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000]
# Custom: [0, 10, 50, 100, 500, 1000, 5000] (15 boundaries -> 7 boundaries)
custom_buckets = [0, 10, 50, 100, 500, 1000, 5000]

# Create view with custom aggregation
duration_view = View(
    instrument_type=Histogram,
    instrument_name="http.server.request.duration",
    aggregation=ExplicitBucketHistogramAggregation(
        boundaries=custom_buckets
    )
)

# Initialize meter provider with views
meter_provider = MeterProvider(
    metric_readers=[reader],
    views=[duration_view]
)

# This reduces histogram bucket series by about 50%
# Before: 15 boundaries create 16 buckets, plus count and sum
# After: 7 boundaries create 8 buckets, plus count and sum
```

### Filtering High-Cardinality Attributes

Attributes multiply metric cardinality. Remove or aggregate high-cardinality attributes to reduce volume.

```python
# Filter out user_id (high cardinality) but keep endpoint (low cardinality)
from opentelemetry.sdk.metrics.view import View
from opentelemetry.sdk.metrics import Counter

filtered_view = View(
    instrument_type=Counter,
    instrument_name="http.server.request.count",
    # Keep only specific attributes
    attribute_keys={"http.method", "http.route", "http.status_code"},
    # Drop user_id, request_id, session_id
)

meter_provider = MeterProvider(
    metric_readers=[reader],
    views=[filtered_view]
)

# Example impact:
# Before: 10 routes * 5 methods * 10 status codes * 1000 users = 500,000 time series
# After: 10 routes * 5 methods * 10 status codes = 500 time series
# Reduction: 99.9%
```

### Using Exponential Histograms

For some use cases, exponential histograms provide better compression than explicit bucket histograms.

```python
from opentelemetry.sdk.metrics import Histogram
from opentelemetry.sdk.metrics.view import (
    ExponentialBucketHistogramAggregation,
    View,
)

exponential_view = View(
    instrument_type=Histogram,
    instrument_name="http.server.request.duration",
    aggregation=ExponentialBucketHistogramAggregation(
        max_scale=20,
        max_size=160
    )
)

# Exponential histograms provide better resolution with fewer buckets
# Automatically adjusts bucket boundaries based on data distribution
```

## Aggregating Metrics in the Collector

The OpenTelemetry Collector's transform and metrics transform processors provide powerful normalization and aggregation capabilities.

### Basic Metric Aggregation

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Transform processor for metric attribute normalization
  transform:
    error_mode: ignore
    metric_statements:
      # Remove high-cardinality labels
      - context: datapoint
        statements:
          - delete_key(attributes, "user.id")
          - delete_key(attributes, "request.id")
          - delete_key(attributes, "trace.id")
          - delete_key(attributes, "span.id")

      # Aggregate HTTP status codes into classes
      - context: datapoint
        statements:
          # Replace individual status codes with status class
          - set(attributes["http.status_class"], "2xx") where Int(attributes["http.status_code"]) >= 200 and Int(attributes["http.status_code"]) < 300
          - set(attributes["http.status_class"], "3xx") where Int(attributes["http.status_code"]) >= 300 and Int(attributes["http.status_code"]) < 400
          - set(attributes["http.status_class"], "4xx") where Int(attributes["http.status_code"]) >= 400 and Int(attributes["http.status_code"]) < 500
          - set(attributes["http.status_class"], "5xx") where Int(attributes["http.status_code"]) >= 500
          # Remove the original status code
          - delete_key(attributes, "http.status_code")

      # Aggregate routes with dynamic parameters
      - context: datapoint
        statements:
          # Replace /users/123 with /users/{id}
          - replace_pattern(attributes["http.route"], "/users/\\d+", "/users/{id}")
          - replace_pattern(attributes["http.route"], "/orders/[a-f0-9-]+", "/orders/{uuid}")
          - replace_pattern(attributes["http.route"], "/api/v\\d+/", "/api/{version}/")

  # Aggregate points that now share the same label set
  metricstransform:
    transforms:
      - include: http.server.request.count
        action: update
        operations:
          - action: aggregate_labels
            label_set: [http.method, http.route, http.status_class]
            aggregation_type: sum
      - include: http.server.request.duration
        action: update
        operations:
          - action: aggregate_labels
            label_set: [http.method, http.route, http.status_class]
            aggregation_type: sum

  # Batch processor for efficiency
  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  otlp:
    endpoint: backend:4317

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [transform, metricstransform, batch]
      exporters: [otlp]
```

This configuration reduces cardinality from potentially thousands of unique combinations to dozens. The `transform` processor normalizes attributes, and the `metricstransform` processor aggregates points with the same remaining label set within a batch.

### Delta to Cumulative Aggregation

Some backends prefer cumulative metrics while SDKs emit delta metrics. Convert at the collector level.

```yaml
processors:
  # Convert delta temporality metrics to cumulative temporality
  deltatocumulative:
    max_stale: 5m
    max_streams: 100000

  # If you need the opposite direction, use cumulativetodelta
  cumulativetodelta:
    include:
      metric_types:
        - sum
```

### Time-Based Aggregation Windows

Aggregate metrics into larger time windows to reduce data points.

```yaml
processors:
  # Aggregate supported cumulative metrics and gauges, then forward every 5 minutes
  interval:
    interval: 5m
    pass_through:
      gauge: false
      summary: false

  batch:
    timeout: 10s
    send_batch_size: 10000
```

## Implementing Application-Level Aggregation

OpenTelemetry SDKs already aggregate measurements before export. Application-level pre-aggregation is useful when you need to reduce measurement call overhead, normalize attributes before recording, or combine very noisy events before they reach the SDK.

### Pre-Aggregation in Go

```go
// metrics_aggregator.go
package main

import (
    "context"
    "sort"
    "strings"
    "sync"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
)

type counterEntry struct {
    name       string
    attributes []attribute.KeyValue
    value      int64
}

// MetricAggregator aggregates metrics in memory before export
type MetricAggregator struct {
    meter  metric.Meter
    mu     sync.RWMutex

    // Aggregated counters
    counters map[string]counterEntry
    instruments map[string]metric.Int64Counter

    // Flush interval
    flushInterval time.Duration
}

func NewMetricAggregator(meter metric.Meter, flushInterval time.Duration) *MetricAggregator {
    agg := &MetricAggregator{
        meter:         meter,
        counters:      make(map[string]counterEntry),
        instruments:   make(map[string]metric.Int64Counter),
        flushInterval: flushInterval,
    }

    // Start background flusher
    go agg.flusher()

    return agg
}

// Increment counter in memory
func (a *MetricAggregator) IncrementCounter(name string, value int64, attributes map[string]string) {
    key, attrs := counterKey(name, attributes)

    a.mu.Lock()
    entry := a.counters[key]
    entry.name = name
    entry.attributes = attrs
    entry.value += value
    a.counters[key] = entry
    a.mu.Unlock()
}

// Flush aggregated metrics to OpenTelemetry
func (a *MetricAggregator) flush() {
    a.mu.Lock()
    counters := a.counters
    a.counters = make(map[string]counterEntry)
    a.mu.Unlock()

    // Export aggregated values
    for _, entry := range counters {
        counter, ok := a.instruments[entry.name]
        if !ok {
            counter, _ = a.meter.Int64Counter(entry.name)
            a.instruments[entry.name] = counter
        }
        counter.Add(
            context.Background(),
            entry.value,
            metric.WithAttributes(entry.attributes...),
        )
    }
}

func counterKey(name string, attributes map[string]string) (string, []attribute.KeyValue) {
    keys := make([]string, 0, len(attributes))
    for k := range attributes {
        keys = append(keys, k)
    }
    sort.Strings(keys)

    parts := []string{name}
    attrs := make([]attribute.KeyValue, 0, len(keys))
    for _, k := range keys {
        parts = append(parts, k+"="+attributes[k])
        attrs = append(attrs, attribute.String(k, attributes[k]))
    }

    return strings.Join(parts, "\x00"), attrs
}

// Background flusher
func (a *MetricAggregator) flusher() {
    ticker := time.NewTicker(a.flushInterval)
    defer ticker.Stop()

    for range ticker.C {
        a.flush()
    }
}

// Usage example
func main() {
    meter := otel.Meter("example")
    agg := NewMetricAggregator(meter, 60*time.Second)

    // Record thousands of increments in memory
    for i := 0; i < 10000; i++ {
        agg.IncrementCounter("http.requests", 1, map[string]string{
            "method": "GET",
            "route":  "/api/users",
        })
    }

    // The SDK sees one Add call after flush for this attribute set,
    // instead of 10,000 Add calls.
}
```

### Pre-Aggregation in Python

```python
# metrics_aggregator.py
from typing import Dict, Tuple
import threading
import time
from collections import defaultdict
from opentelemetry import metrics

class MetricAggregator:
    """Aggregate metrics in memory before exporting to OpenTelemetry"""

    def __init__(self, meter: metrics.Meter, flush_interval: int = 60):
        self.meter = meter
        self.flush_interval = flush_interval
        self.lock = threading.Lock()

        # In-memory aggregation storage
        self.counters: Dict[Tuple[str, frozenset], int] = defaultdict(int)
        self.gauges: Dict[Tuple[str, frozenset], float] = {}
        self.histograms: Dict[Tuple[str, frozenset], list] = defaultdict(list)
        self.counter_instruments = {}
        self.gauge_instruments = {}
        self.histogram_instruments = {}

        # Start background flusher
        self.running = True
        self.flush_thread = threading.Thread(target=self._flusher, daemon=True)
        self.flush_thread.start()

    def increment_counter(self, name: str, value: int = 1, attributes: dict = None):
        """Increment counter in memory"""
        attrs = frozenset(attributes.items()) if attributes else frozenset()
        key = (name, attrs)

        with self.lock:
            self.counters[key] += value

    def set_gauge(self, name: str, value: float, attributes: dict = None):
        """Set gauge value (keeps latest)"""
        attrs = frozenset(attributes.items()) if attributes else frozenset()
        key = (name, attrs)

        with self.lock:
            self.gauges[key] = value

    def record_histogram(self, name: str, value: float, attributes: dict = None):
        """Record histogram value"""
        attrs = frozenset(attributes.items()) if attributes else frozenset()
        key = (name, attrs)

        with self.lock:
            self.histograms[key].append(value)

    def flush(self):
        """Flush aggregated metrics to OpenTelemetry"""
        with self.lock:
            # Copy and clear counters
            counters = dict(self.counters)
            self.counters.clear()

            # Copy and clear gauges
            gauges = dict(self.gauges)
            self.gauges.clear()

            # Copy and clear histograms
            histograms = dict(self.histograms)
            self.histograms.clear()

        # Export counters
        for (name, attrs), value in counters.items():
            if name not in self.counter_instruments:
                self.counter_instruments[name] = self.meter.create_counter(name)
            counter = self.counter_instruments[name]
            counter.add(value, dict(attrs))

        # Export gauges
        for (name, attrs), value in gauges.items():
            if name not in self.gauge_instruments:
                self.gauge_instruments[name] = self.meter.create_gauge(name)
            gauge = self.gauge_instruments[name]
            gauge.set(value, dict(attrs))

        # Export histogram aggregates
        for (name, attrs), values in histograms.items():
            if name not in self.histogram_instruments:
                self.histogram_instruments[name] = self.meter.create_histogram(name)
            histogram = self.histogram_instruments[name]
            # Recording an average is lossy and does not preserve percentiles.
            # Use SDK Views or exponential histograms when distribution accuracy matters.
            if values:
                count = len(values)
                total = sum(values)
                avg = total / count

                # Record a representative aggregate value
                histogram.record(avg, dict(attrs))

    def _flusher(self):
        """Background thread that flushes metrics periodically"""
        while self.running:
            time.sleep(self.flush_interval)
            self.flush()

# Usage example
meter = metrics.get_meter(__name__)
aggregator = MetricAggregator(meter, flush_interval=60)

# Record thousands of metrics in memory
for i in range(10000):
    aggregator.increment_counter(
        "http.server.request.count",
        value=1,
        attributes={"method": "GET", "route": "/api/users"}
    )

# The SDK sees one counter add after 60 seconds for this attribute set,
# instead of 10,000 add calls.
```

### Pre-Aggregation in Java

```java
// MetricAggregator.java
package com.example.metrics;

import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.common.AttributesBuilder;
import io.opentelemetry.api.metrics.Meter;
import io.opentelemetry.api.metrics.LongCounter;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.LongAdder;

public class MetricAggregator {
    private final Meter meter;
    private final int flushIntervalSeconds;
    private final ScheduledExecutorService scheduler;

    // In-memory aggregation storage
    private final ConcurrentMap<String, CounterEntry> counters;
    private final ConcurrentMap<String, LongCounter> instruments;

    private static class CounterEntry {
        final String name;
        final Attributes attributes;
        final LongAdder value = new LongAdder();

        CounterEntry(String name, Attributes attributes) {
            this.name = name;
            this.attributes = attributes;
        }
    }

    private static class CounterSnapshot {
        final String name;
        final Attributes attributes;
        final long value;

        CounterSnapshot(String name, Attributes attributes, long value) {
            this.name = name;
            this.attributes = attributes;
            this.value = value;
        }
    }

    public MetricAggregator(Meter meter, int flushIntervalSeconds) {
        this.meter = meter;
        this.flushIntervalSeconds = flushIntervalSeconds;
        this.counters = new ConcurrentHashMap<>();
        this.instruments = new ConcurrentHashMap<>();
        this.scheduler = Executors.newSingleThreadScheduledExecutor();

        // Start periodic flush
        scheduler.scheduleAtFixedRate(
            this::flush,
            flushIntervalSeconds,
            flushIntervalSeconds,
            TimeUnit.SECONDS
        );
    }

    /**
     * Increment counter in memory
     */
    public void incrementCounter(String name, long value, Map<String, String> attributes) {
        // Create key from name and attributes
        String key = buildKey(name, attributes);
        Attributes otelAttributes = buildAttributes(attributes);

        // Increment in memory using LongAdder for thread safety
        counters
            .computeIfAbsent(key, k -> new CounterEntry(name, otelAttributes))
            .value
            .add(value);
    }

    /**
     * Flush aggregated metrics to OpenTelemetry
     */
    private void flush() {
        // Snapshot and clear counters atomically
        Map<String, CounterSnapshot> snapshot = new HashMap<>();
        counters.forEach((key, entry) -> {
            long value = entry.value.sumThenReset();
            if (value > 0) {
                snapshot.put(
                    key,
                    new CounterSnapshot(entry.name, entry.attributes, value)
                );
            }
        });

        // Export aggregated values
        snapshot.forEach((key, entry) -> {
            LongCounter counter = instruments.computeIfAbsent(
                entry.name,
                metricName -> meter.counterBuilder(metricName).build()
            );
            counter.add(entry.value, entry.attributes);
        });
    }

    private String buildKey(String name, Map<String, String> attributes) {
        StringBuilder key = new StringBuilder(name);
        if (attributes != null) {
            attributes.keySet().stream().sorted().forEach(k ->
                key.append('\0').append(k).append("=").append(attributes.get(k))
            );
        }
        return key.toString();
    }

    private Attributes buildAttributes(Map<String, String> attributes) {
        AttributesBuilder builder = Attributes.builder();
        if (attributes != null) {
            attributes.forEach(builder::put);
        }
        return builder.build();
    }

    public void shutdown() {
        flush(); // Final flush
        scheduler.shutdown();
    }
}

// Usage example
Meter meter = openTelemetry.getMeter("example");
MetricAggregator aggregator = new MetricAggregator(meter, 60);

// Record thousands of increments in memory
for (int i = 0; i < 10000; i++) {
    aggregator.incrementCounter(
        "http.server.request.count",
        1,
        Map.of("method", "GET", "route", "/api/users")
    );
}

// The SDK sees one counter add after 60 seconds for this attribute set
```

## Cardinality Management Strategies

High cardinality kills metric systems. Apply these strategies to control cardinality:

```yaml
# Cardinality reduction configuration
processors:
  transform:
    metric_statements:
      # Strategy 1: Remove high-cardinality attributes
      - context: datapoint
        statements:
          - delete_key(attributes, "user.id")
          - delete_key(attributes, "session.id")
          - delete_key(attributes, "request.id")

      # Strategy 2: Aggregate into buckets
      - context: datapoint
        statements:
          # Bucket response sizes
          - set(attributes["response.size.bucket"], "small") where Int(attributes["response.size"]) < 1024
          - set(attributes["response.size.bucket"], "medium") where Int(attributes["response.size"]) >= 1024 and Int(attributes["response.size"]) < 1048576
          - set(attributes["response.size.bucket"], "large") where Int(attributes["response.size"]) >= 1048576
          - delete_key(attributes, "response.size")

      # Strategy 3: Limit distinct values
      - context: datapoint
        statements:
          # Keep only top endpoints, group rest as "other"
          - set(attributes["http.route"], "other") where attributes["http.route"] != "/api/users" and attributes["http.route"] != "/api/orders" and attributes["http.route"] != "/api/products"

  # Strategy 4: Drop detailed high-cardinality metrics entirely
  filter/drop_detailed:
    error_mode: ignore
    metric_conditions:
      - metric.name == "http.server.request.duration.detailed"
```

## Monitoring Aggregation Impact

Track the impact of aggregation on data volume:

```python
# aggregation_metrics.py
from dataclasses import dataclass
from datetime import datetime

@dataclass
class AggregationMetrics:
    """Track aggregation effectiveness"""
    pre_aggregation_points: int
    post_aggregation_points: int
    compression_ratio: float
    timestamp: datetime

    @classmethod
    def calculate(cls, before: int, after: int):
        """Calculate aggregation metrics"""
        ratio = before / after if after > 0 else 0
        reduction_pct = (1 - after / before) * 100 if before > 0 else 0

        print(f"Aggregation Impact:")
        print(f"  Before: {before:,} data points")
        print(f"  After:  {after:,} data points")
        print(f"  Compression ratio: {ratio:.1f}x")
        print(f"  Reduction: {reduction_pct:.1f}%")

        return cls(
            pre_aggregation_points=before,
            post_aggregation_points=after,
            compression_ratio=ratio,
            timestamp=datetime.now()
        )

# Example usage
metrics = AggregationMetrics.calculate(
    before=1000000,  # 1M raw data points
    after=50000      # 50K aggregated data points
)
# Output: Compression ratio: 20.0x, Reduction: 95.0%
```

## Best Practices

1. **Aggregate early**: Reduce volume at the source before network transmission
2. **Remove high-cardinality attributes**: User IDs, request IDs, trace IDs don't belong in metrics
3. **Use appropriate time windows**: Longer windows = more aggregation = less volume
4. **Bucket continuous values**: Convert precise values to ranges
5. **Monitor cardinality**: Track unique time series counts over time
6. **Test aggregation impact**: Ensure aggregation doesn't hide important patterns

For additional optimization techniques, see [How to Implement Cardinality Limits to Prevent Metric Explosions](https://oneuptime.com/blog/post/2026-02-06-cardinality-limits-prevent-metric-explosions/view) and [How to Benchmark OpenTelemetry SDK Overhead in Go, Java, and Python](https://oneuptime.com/blog/post/2026-02-06-benchmark-opentelemetry-sdk-overhead-go-java-python/view).

Source-level aggregation dramatically reduces metric data volume while preserving observability, making it a critical optimization for production OpenTelemetry deployments.
