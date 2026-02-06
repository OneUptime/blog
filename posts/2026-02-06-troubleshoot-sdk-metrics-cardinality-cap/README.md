# How to Troubleshoot the OpenTelemetry SDK Silently Capping Metrics at 2000 Cardinality and Losing Data Points

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Metrics, Cardinality, SDK Limits

Description: Troubleshoot silent data loss caused by the OpenTelemetry SDK capping metric cardinality at the default 2000 limit.

Your metric dashboards show consistent values for some attribute combinations but mysteriously flat or missing data for others. The metrics are not being dropped by the Collector or the backend. They are being silently capped at the SDK level before they ever leave your application. The default cardinality limit of 2000 unique attribute combinations per metric is the cause.

## What Is Metric Cardinality?

Cardinality is the number of unique time series a metric produces. Each unique combination of attribute values creates a new time series:

```python
meter = metrics.get_meter("my-service")
counter = meter.create_counter("http.requests")

# Each unique combination of attributes = one time series
counter.add(1, {"method": "GET", "path": "/users", "status": 200})     # Series 1
counter.add(1, {"method": "POST", "path": "/users", "status": 201})    # Series 2
counter.add(1, {"method": "GET", "path": "/orders", "status": 200})    # Series 3
counter.add(1, {"method": "GET", "path": "/users", "status": 404})     # Series 4
# ... and so on
```

If you have 10 HTTP methods, 500 paths, and 20 status codes, that is 10 * 500 * 20 = 100,000 potential time series for a single metric.

## The Default Limit

The OpenTelemetry SDK defaults to 2000 unique attribute combinations per metric instrument. Once this limit is hit, any new combinations are dropped and an "overflow" attribute set is used to aggregate them:

```
# The SDK creates a special overflow series:
# otel.metric.overflow = true
# All new attribute combinations get lumped into this overflow bucket
```

The problem is that this happens silently. No error is thrown, no log is written (unless you have debug logging enabled), and you just see incomplete data.

## Detecting the Cap

Enable SDK debug logging:

```python
import logging
logging.getLogger("opentelemetry.sdk.metrics").setLevel(logging.DEBUG)

# Look for messages like:
# "Dropping measurement, cardinality limit reached for metric http.requests"
```

Check for the overflow attribute in your backend:

```promql
# In Prometheus, look for the overflow series
{__name__="http_requests_total", otel_metric_overflow="true"}
```

## Fix 1: Reduce Attribute Cardinality

The best fix is to reduce the number of unique attribute combinations. Remove high-cardinality attributes or bucket them:

```python
# BEFORE: High cardinality (hundreds of unique paths)
counter.add(1, {
    "method": "GET",
    "path": request.path,        # /users/12345, /users/67890, etc.
    "status": response.status,
})

# AFTER: Low cardinality (bounded set of route patterns)
counter.add(1, {
    "method": request.method,
    "route": "/users/{id}",      # Use the route pattern, not the actual path
    "status_class": f"{response.status // 100}xx",  # 2xx, 4xx, 5xx instead of 200, 404, 500
})
```

## Fix 2: Increase the Cardinality Limit

If you genuinely need more than 2000 series, increase the limit:

```python
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import View

# Set a higher cardinality limit globally
import os
os.environ["OTEL_METRIC_EXPORT_INTERVAL"] = "30000"

# Or set it per-instrument using Views
provider = MeterProvider(
    views=[
        View(
            instrument_name="http.requests",
            attribute_keys=["method", "route", "status"],  # Explicitly list allowed attributes
            # This also effectively controls cardinality by limiting which attributes are kept
        ),
    ],
)
```

Via environment variable (SDK-dependent):

```bash
# Some SDK implementations support this
export OTEL_CARDINALITY_LIMIT=5000
```

For Go:

```go
import "go.opentelemetry.io/otel/sdk/metric"

provider := metric.NewMeterProvider(
    metric.WithView(metric.NewView(
        metric.Instrument{Name: "http.requests"},
        metric.Stream{
            // CardinalityLimit is available in newer SDK versions
            AttributeFilter: attribute.NewAllowKeysFilter(
                attribute.Key("method"),
                attribute.Key("route"),
                attribute.Key("status"),
            ),
        },
    )),
)
```

## Fix 3: Use Views to Drop Unnecessary Attributes

Views can filter out high-cardinality attributes before they create new time series:

```python
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import View

provider = MeterProvider(
    views=[
        # Only keep these attributes for the http.requests metric
        View(
            instrument_name="http.requests",
            attribute_keys={"method", "route", "status_code"},
            # All other attributes are dropped before aggregation
        ),
        # Different attributes for a different metric
        View(
            instrument_name="db.queries",
            attribute_keys={"db.system", "db.operation"},
        ),
    ],
)
```

## Fix 4: Use the Collector to Filter High-Cardinality Metrics

If you cannot change the SDK, filter at the Collector level:

```yaml
processors:
  metricstransform:
    transforms:
      - include: "http.requests"
        match_type: strict
        action: update
        operations:
          # Remove high-cardinality attributes
          - action: delete_label_value
            label: path
```

Or use the filter processor to drop specific metric series:

```yaml
processors:
  filter/metrics:
    metrics:
      exclude:
        match_type: expr
        expressions:
          - 'Label("path") != ""'  # Drop any series that has a path label
```

## Monitoring Cardinality

Track how close you are to the limit:

```yaml
# Collector internal metrics
service:
  telemetry:
    metrics:
      level: detailed
```

```promql
# Check cardinality per metric
count by (__name__) ({__name__=~"http.*"})

# Alert when approaching the limit
count by (__name__) ({__name__=~"otelcol.*"}) > 1500
```

The cardinality cap exists to protect your application from unbounded memory growth. Before increasing it, always ask whether you genuinely need that many unique time series. In most cases, reducing cardinality through attribute normalization is the better approach.
