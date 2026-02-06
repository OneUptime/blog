# How to Implement Cardinality Limits to Prevent Metric Explosions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Metrics, Cardinality, Performance, Observability, Cost Optimization

Description: Prevent metric cardinality explosions with practical strategies and configurations for implementing cardinality limits in OpenTelemetry deployments.

Metric cardinality explosions are one of the most common and expensive problems in observability systems. A single misconfigured label can generate millions of unique time series, crashing collectors, overwhelming backends, and generating massive bills.

This guide shows you how to implement cardinality limits at multiple levels to prevent metric explosions before they impact your system.

## Understanding Metric Cardinality

Metric cardinality is the number of unique time series for a given metric. Each unique combination of metric name and label values creates a separate time series.

```mermaid
graph TD
    A[Metric: http_requests_total] --> B[Label: method]
    A --> C[Label: endpoint]
    A --> D[Label: status_code]

    B --> E[GET, POST, PUT, DELETE]
    C --> F[/users, /orders, /products, ...]
    D --> G[200, 201, 400, 404, 500, ...]

    E --> H[Cardinality = methods × endpoints × status_codes]
    F --> H
    G --> H

    H --> I[4 methods × 50 endpoints × 10 codes = 2,000 time series]

    style H fill:#faa,stroke:#333
    style I fill:#faa,stroke:#333
```

Low-cardinality labels have few distinct values (method, status_code).
High-cardinality labels have many distinct values (user_id, request_id, timestamp).

## The Cardinality Explosion Problem

Consider this seemingly innocent metric:

```python
# DANGEROUS: High-cardinality metric
from opentelemetry import metrics

meter = metrics.get_meter(__name__)
request_counter = meter.create_counter("http.requests")

# Recording with user_id creates one time series per user
def handle_request(user_id, endpoint, method):
    request_counter.add(1, {
        "user.id": user_id,        # High cardinality: millions of users
        "endpoint": endpoint,       # Medium cardinality: hundreds of endpoints
        "method": method,           # Low cardinality: 4-5 methods
        "status_code": status_code  # Low cardinality: 10-20 codes
    })
```

Cardinality calculation:
```
1,000,000 users × 200 endpoints × 5 methods × 15 status codes = 15 billion time series
```

At $0.10 per time series per month, this single metric costs $1.5 billion per month.

## SDK-Level Cardinality Limits

Implement cardinality protection directly in the OpenTelemetry SDK using Views.

### Setting Cardinality Limits in Python

```python
# cardinality_limits.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import View
from opentelemetry.sdk.metrics.aggregation import (
    DefaultAggregation,
    DropAggregation,
)

# Define view with attribute limits
request_view = View(
    instrument_type=Counter,
    instrument_name="http.requests",
    # Only keep low-cardinality attributes
    attribute_keys={"method", "endpoint", "status_code"},
    # Drop high-cardinality attributes
)

# Create meter provider with views
meter_provider = MeterProvider(
    metric_readers=[reader],
    views=[request_view]
)

metrics.set_meter_provider(meter_provider)

# Now user_id is automatically dropped
meter = metrics.get_meter(__name__)
request_counter = meter.create_counter("http.requests")

request_counter.add(1, {
    "user.id": "user-12345",     # DROPPED by view
    "endpoint": "/api/users",     # KEPT
    "method": "GET",              # KEPT
    "status_code": "200"          # KEPT
})
```

### Setting Cardinality Limits in Go

```go
// cardinality_limits.go
package main

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
    "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/metric/metricdata"
)

// CardinalityLimitFilter filters high-cardinality attributes
type CardinalityLimitFilter struct {
    allowedKeys map[string]bool
}

func NewCardinalityLimitFilter(allowedKeys []string) *CardinalityLimitFilter {
    keys := make(map[string]bool)
    for _, key := range allowedKeys {
        keys[key] = true
    }
    return &CardinalityLimitFilter{allowedKeys: keys}
}

// Filter removes high-cardinality attributes
func (f *CardinalityLimitFilter) Filter(attrs []attribute.KeyValue) []attribute.KeyValue {
    filtered := make([]attribute.KeyValue, 0, len(attrs))
    for _, attr := range attrs {
        if f.allowedKeys[string(attr.Key)] {
            filtered = append(filtered, attr)
        }
    }
    return filtered
}

// View configuration with cardinality limits
func setupMeterProvider() *metric.MeterProvider {
    // Define allowed attributes for each metric
    requestView := metric.NewView(
        metric.Instrument{
            Name: "http.requests",
        },
        metric.Stream{
            // Limit to specific attributes
            AttributeFilter: attribute.NewSet(
                attribute.String("method", ""),
                attribute.String("endpoint", ""),
                attribute.String("status_code", ""),
            ).Filter,
        },
    )

    return metric.NewMeterProvider(
        metric.WithView(requestView),
        metric.WithReader(reader),
    )
}

func main() {
    provider := setupMeterProvider()
    otel.SetMeterProvider(provider)

    meter := otel.Meter("example")
    counter, _ := meter.Int64Counter("http.requests")

    // Record with multiple attributes
    counter.Add(context.Background(), 1,
        metric.WithAttributes(
            attribute.String("user.id", "user-12345"),   // DROPPED
            attribute.String("endpoint", "/api/users"),   // KEPT
            attribute.String("method", "GET"),            // KEPT
            attribute.String("status_code", "200"),       // KEPT
        ),
    )
}
```

### Setting Cardinality Limits in Java

```java
// CardinalityLimits.java
package com.example.metrics;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.metrics.Meter;
import io.opentelemetry.api.metrics.LongCounter;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.metrics.SdkMeterProvider;
import io.opentelemetry.sdk.metrics.View;
import io.opentelemetry.sdk.metrics.Aggregation;
import io.opentelemetry.sdk.metrics.InstrumentSelector;
import io.opentelemetry.sdk.metrics.InstrumentType;

public class CardinalityLimits {

    public static OpenTelemetry setupWithCardinalityLimits() {
        // Define view that limits cardinality
        View requestView = View.builder()
            .setName("http.requests")
            // Only include specific attributes
            .setAttributeFilter(attributeKey -> {
                String key = attributeKey.getKey();
                return key.equals("method") ||
                       key.equals("endpoint") ||
                       key.equals("status_code");
            })
            .build();

        // Register view with meter provider
        SdkMeterProvider meterProvider = SdkMeterProvider.builder()
            .registerView(
                InstrumentSelector.builder()
                    .setType(InstrumentType.COUNTER)
                    .setName("http.requests")
                    .build(),
                requestView
            )
            .build();

        return OpenTelemetrySdk.builder()
            .setMeterProvider(meterProvider)
            .build();
    }

    public static void main(String[] args) {
        OpenTelemetry openTelemetry = setupWithCardinalityLimits();
        Meter meter = openTelemetry.getMeter("example");

        LongCounter counter = meter.counterBuilder("http.requests").build();

        // Record with multiple attributes
        counter.add(1, Attributes.builder()
            .put("user.id", "user-12345")      // DROPPED
            .put("endpoint", "/api/users")     // KEPT
            .put("method", "GET")              // KEPT
            .put("status_code", "200")         // KEPT
            .build()
        );
    }
}
```

## Collector-Level Cardinality Limits

Implement cardinality protection in the OpenTelemetry Collector as a last line of defense.

### Basic Cardinality Filtering

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Transform processor to drop high-cardinality attributes
  transform:
    metric_statements:
      - context: datapoint
        statements:
          # Drop known high-cardinality attributes
          - delete_key(attributes, "user.id")
          - delete_key(attributes, "user.email")
          - delete_key(attributes, "session.id")
          - delete_key(attributes, "request.id")
          - delete_key(attributes, "trace.id")
          - delete_key(attributes, "span.id")
          - delete_key(attributes, "ip.address")
          - delete_key(attributes, "timestamp")

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
      processors: [transform, batch]
      exporters: [otlp]
```

### Advanced Cardinality Management

Use the filter processor with cardinality tracking:

```yaml
processors:
  # Filter processor with cardinality limits
  filter:
    metrics:
      datapoint:
        # Drop metrics with too many unique attribute combinations
        - 'attributes["cardinality.estimate"] > 10000'

  # Transform processor to estimate cardinality
  transform:
    metric_statements:
      # Count unique combinations per metric
      - context: datapoint
        statements:
          # Add cardinality estimate based on attribute count
          - set(attributes["cardinality.estimate"],
                Int(attributes["method.count"]) *
                Int(attributes["endpoint.count"]) *
                Int(attributes["status.count"]))

      # Drop metrics exceeding limits
      - context: metric
        statements:
          - drop() where attributes["cardinality.estimate"] > 10000

  # Aggregate high-cardinality attributes
  metricstransform:
    transforms:
      # Group dynamic routes
      - include: http.requests
        match_type: regexp
        action: update
        operations:
          - action: update_label
            label: endpoint
            value_actions:
              # Replace /users/123 with /users/{id}
              - value: /users/\d+
                new_value: /users/{id}
              - value: /orders/[a-f0-9-]+
                new_value: /orders/{uuid}
```

## Implementing Cardinality Tracking

Monitor cardinality in real-time to detect explosions early.

### Cardinality Tracking in Python

```python
# cardinality_tracker.py
from collections import defaultdict
from typing import Dict, Set
import threading
import time
from opentelemetry import metrics

class CardinalityTracker:
    """Track and limit metric cardinality"""

    def __init__(self, max_cardinality: int = 1000):
        self.max_cardinality = max_cardinality
        self.lock = threading.Lock()

        # Track unique time series per metric
        self.time_series: Dict[str, Set[frozenset]] = defaultdict(set)

        # Track dropped metrics
        self.dropped_count = 0

        # Cardinality gauge
        meter = metrics.get_meter(__name__)
        self.cardinality_gauge = meter.create_gauge("metric.cardinality")
        self.dropped_gauge = meter.create_gauge("metric.dropped.count")

        # Start monitoring thread
        threading.Thread(target=self._monitor, daemon=True).start()

    def check_cardinality(self, metric_name: str, attributes: dict) -> bool:
        """Check if adding this time series exceeds cardinality limit"""
        attrs = frozenset(attributes.items())

        with self.lock:
            time_series_set = self.time_series[metric_name]

            # Check if this is a new time series
            if attrs not in time_series_set:
                if len(time_series_set) >= self.max_cardinality:
                    # Cardinality limit exceeded
                    self.dropped_count += 1
                    return False

                # Add new time series
                time_series_set.add(attrs)

        return True

    def record_metric(self, metric_name: str, value: float, attributes: dict):
        """Record metric with cardinality check"""
        if self.check_cardinality(metric_name, attributes):
            # Record metric normally
            meter = metrics.get_meter(__name__)
            counter = meter.create_counter(metric_name)
            counter.add(value, attributes)
        else:
            # Drop metric due to cardinality limit
            print(f"WARNING: Dropped metric {metric_name} due to cardinality limit")

    def get_cardinality(self, metric_name: str) -> int:
        """Get current cardinality for a metric"""
        with self.lock:
            return len(self.time_series[metric_name])

    def _monitor(self):
        """Monitor and report cardinality metrics"""
        while True:
            time.sleep(60)

            with self.lock:
                for metric_name, series_set in self.time_series.items():
                    cardinality = len(series_set)

                    # Report cardinality
                    self.cardinality_gauge.set(
                        cardinality,
                        {"metric.name": metric_name}
                    )

                    # Warn if approaching limit
                    if cardinality > self.max_cardinality * 0.8:
                        print(f"WARNING: {metric_name} cardinality at {cardinality}/{self.max_cardinality}")

                # Report dropped count
                self.dropped_gauge.set(self.dropped_count)

# Usage example
tracker = CardinalityTracker(max_cardinality=1000)

# Record metrics with cardinality protection
for i in range(2000):
    tracker.record_metric(
        "http.requests",
        1,
        {
            "endpoint": f"/api/endpoint{i}",  # High cardinality
            "method": "GET",
            "status_code": "200"
        }
    )

# After 1000 unique time series, additional ones are dropped
print(f"Cardinality: {tracker.get_cardinality('http.requests')}")
print(f"Dropped: {tracker.dropped_count}")
```

### Cardinality Alerting

Set up alerts for cardinality explosions:

```yaml
# prometheus-alerts.yaml
groups:
  - name: cardinality_alerts
    interval: 30s
    rules:
      # Alert when cardinality exceeds threshold
      - alert: HighMetricCardinality
        expr: |
          metric_cardinality > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High metric cardinality detected"
          description: "Metric {{ $labels.metric_name }} has {{ $value }} unique time series"

      # Alert when cardinality grows rapidly
      - alert: CardinalityGrowth
        expr: |
          rate(metric_cardinality[5m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Rapid cardinality growth"
          description: "Metric {{ $labels.metric_name }} cardinality growing at {{ $value }} series/sec"

      # Alert when metrics are dropped
      - alert: MetricsDropped
        expr: |
          rate(metric_dropped_count[5m]) > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Metrics being dropped"
          description: "{{ $value }} metrics/sec dropped due to cardinality limits"
```

## Cardinality Reduction Strategies

Implement these patterns to reduce cardinality without losing observability:

### Strategy 1: Bucketing

Convert continuous or high-cardinality values into buckets:

```python
# bucketing.py
def bucket_response_time(duration_ms: float) -> str:
    """Bucket response time into ranges"""
    if duration_ms < 100:
        return "fast"
    elif duration_ms < 500:
        return "normal"
    elif duration_ms < 1000:
        return "slow"
    else:
        return "very_slow"

def bucket_response_size(bytes: int) -> str:
    """Bucket response size into ranges"""
    if bytes < 1024:
        return "small"
    elif bytes < 1024 * 1024:
        return "medium"
    else:
        return "large"

# Use buckets instead of exact values
counter.add(1, {
    "duration_bucket": bucket_response_time(duration),  # 4 values instead of infinite
    "size_bucket": bucket_response_size(size),          # 3 values instead of infinite
})
```

### Strategy 2: Top-K with "Other"

Track only the top K values, grouping the rest as "other":

```python
# topk.py
from collections import Counter
import threading

class TopKLabels:
    """Track only top K label values"""

    def __init__(self, k: int = 100):
        self.k = k
        self.lock = threading.Lock()
        self.counts = Counter()
        self.top_k = set()

    def get_label_value(self, value: str) -> str:
        """Get label value, mapping low-frequency values to 'other'"""
        with self.lock:
            # Update counts
            self.counts[value] += 1

            # Recalculate top K periodically
            if len(self.counts) % 1000 == 0:
                self.top_k = set([k for k, v in self.counts.most_common(self.k)])

            # Return value or 'other'
            return value if value in self.top_k else "other"

# Usage
endpoint_tracker = TopKLabels(k=50)

counter.add(1, {
    "endpoint": endpoint_tracker.get_label_value("/api/users"),  # Max 50 unique + 'other'
    "method": "GET",
    "status_code": "200"
})

# Cardinality: 51 endpoints × 5 methods × 15 codes = 3,825 time series
# Instead of: thousands of endpoints × 5 methods × 15 codes = millions of time series
```

### Strategy 3: Aggregation

Aggregate related labels into higher-level categories:

```yaml
processors:
  transform:
    metric_statements:
      - context: datapoint
        statements:
          # Aggregate status codes into classes
          - set(attributes["status_class"], "2xx") where Int(attributes["status_code"]) >= 200 and Int(attributes["status_code"]) < 300
          - set(attributes["status_class"], "4xx") where Int(attributes["status_code"]) >= 400 and Int(attributes["status_code"]) < 500
          - set(attributes["status_class"], "5xx") where Int(attributes["status_code"]) >= 500
          - delete_key(attributes, "status_code")

          # Aggregate HTTP methods
          - set(attributes["method_type"], "read") where attributes["method"] == "GET" or attributes["method"] == "HEAD"
          - set(attributes["method_type"], "write") where attributes["method"] == "POST" or attributes["method"] == "PUT" or attributes["method"] == "PATCH"
          - set(attributes["method_type"], "delete") where attributes["method"] == "DELETE"
          - delete_key(attributes, "method")

          # Aggregate routes by service area
          - set(attributes["service_area"], "users") where IsMatch(attributes["endpoint"], "^/api/users/.*")
          - set(attributes["service_area"], "orders") where IsMatch(attributes["endpoint"], "^/api/orders/.*")
          - set(attributes["service_area"], "products") where IsMatch(attributes["endpoint"], "^/api/products/.*")
          - delete_key(attributes, "endpoint")
```

## Cardinality Budget Management

Allocate cardinality budget across teams and services:

```python
# cardinality_budget.py
from dataclasses import dataclass
from typing import Dict

@dataclass
class CardinalityBudget:
    """Manage cardinality budget per team/service"""
    team: str
    allocated: int
    used: int

    @property
    def remaining(self) -> int:
        return self.allocated - self.used

    @property
    def utilization(self) -> float:
        return (self.used / self.allocated) * 100 if self.allocated > 0 else 0

class CardinalityBudgetManager:
    """Manage cardinality budgets across teams"""

    def __init__(self, total_budget: int = 100000):
        self.total_budget = total_budget
        self.budgets: Dict[str, CardinalityBudget] = {}

    def allocate(self, team: str, amount: int):
        """Allocate cardinality budget to a team"""
        self.budgets[team] = CardinalityBudget(
            team=team,
            allocated=amount,
            used=0
        )

    def use(self, team: str, amount: int) -> bool:
        """Use cardinality budget, return False if exceeded"""
        if team not in self.budgets:
            return False

        budget = self.budgets[team]
        if budget.remaining >= amount:
            budget.used += amount
            return True

        return False

    def report(self):
        """Report cardinality budget utilization"""
        print("Cardinality Budget Report:")
        print(f"Total Budget: {self.total_budget:,}")
        print()

        for team, budget in sorted(self.budgets.items()):
            print(f"{team}:")
            print(f"  Allocated: {budget.allocated:,}")
            print(f"  Used: {budget.used:,}")
            print(f"  Remaining: {budget.remaining:,}")
            print(f"  Utilization: {budget.utilization:.1f}%")
            print()

# Usage
manager = CardinalityBudgetManager(total_budget=100000)

# Allocate budgets
manager.allocate("api-team", 30000)
manager.allocate("data-team", 40000)
manager.allocate("platform-team", 30000)

# Teams use their budgets
manager.use("api-team", 15000)
manager.use("data-team", 38000)
manager.use("platform-team", 5000)

# Generate report
manager.report()
```

## Best Practices

1. **Identify high-cardinality labels early**: Review all metric attributes during design
2. **Set cardinality limits at SDK level**: Prevent bad metrics from leaving the application
3. **Implement collector-level limits**: Add a second layer of defense
4. **Monitor cardinality continuously**: Track time series count per metric
5. **Alert on rapid growth**: Detect cardinality explosions before they cause damage
6. **Use bucketing and aggregation**: Reduce cardinality without losing information
7. **Establish cardinality budgets**: Give teams clear limits
8. **Never use unbounded attributes**: User IDs, timestamps, and UUIDs don't belong in metric labels

For related optimization strategies, see [How to Aggregate Metrics at the Source to Reduce Data Volume](https://oneuptime.com/blog/post/aggregate-metrics-source-reduce-data-volume/view) and [How to Implement Rate-Based Sampling for High-Traffic Pipelines](https://oneuptime.com/blog/post/rate-based-sampling-high-traffic-pipelines/view).

Cardinality limits are essential for stable, cost-effective OpenTelemetry deployments, preventing metric explosions before they impact your observability system.
