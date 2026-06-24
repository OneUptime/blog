# How to Troubleshoot the OpenTelemetry SDK Silently Capping Metrics at 2000

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Metric, Cardinality, SDK Limits

Description: Troubleshoot silent data loss caused by the OpenTelemetry SDK capping metric cardinality at the default 2000 limit.

Your metric dashboards show consistent values for some attribute combinations but mysteriously flat or missing data for others. The metrics are not being dropped by the Collector or the backend. They are being silently capped at the SDK level before they ever leave your application. The default cardinality limit of 2000 unique attribute combinations per metric collection cycle is the cause.

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

The OpenTelemetry SDK specification defaults to 2000 unique attribute combinations per metric instrument per collection cycle when no view or MetricReader limit is configured. Once this limit is hit, any new combinations lose their original attribute set and an "overflow" attribute set is used to aggregate them:

```text
# The SDK creates a special overflow series:
# otel.metric.overflow = true
# New attribute combinations beyond the limit get lumped into this overflow bucket
```

The problem is that this can be easy to miss. No error is thrown, logging depends on the SDK implementation and log level, and you just see incomplete attribute-level data.

## Detecting the Cap

Enable SDK debug logging:

```python
import logging
logging.getLogger("opentelemetry.sdk.metrics").setLevel(logging.DEBUG)

# SDK-specific messages may mention the cardinality limit or overflow aggregation.
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

If you genuinely need more than 2000 series, increase the limit in SDKs that expose cardinality limit configuration. If your SDK does not expose a direct limit setting, use Views to keep the active attribute set bounded:

```python
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import View

# Python Views can reduce cardinality by keeping only selected attributes.
provider = MeterProvider(
    views=[
        View(
            instrument_name="http.requests",
            attribute_keys={"method", "route", "status"},  # Explicitly list allowed attributes
            # This also effectively controls cardinality by limiting which attributes are kept
        ),
    ],
)
```

Via environment variable (Java autoconfigure):

```bash
export OTEL_JAVA_METRICS_CARDINALITY_LIMIT=5000
```

For Go:

```go
import (
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/sdk/metric"
)

provider := metric.NewMeterProvider(
    metric.WithCardinalityLimit(5000),
    metric.WithView(metric.NewView(
        metric.Instrument{Name: "http.requests"},
        metric.Stream{
            // Keep only bounded attributes on this instrument.
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

If you cannot change the SDK, aggregate away high-cardinality attributes at the Collector level:

```yaml
processors:
  transform/metrics:
    metric_statements:
      - context: metric
        statements:
          # Keep only these attributes and aggregate datapoints that now match.
          - aggregate_on_attributes("sum", ["method", "route", "status_code"]) where metric.name == "http.requests"
```

Or use the filter processor to drop datapoints that still have a high-cardinality attribute:

```yaml
processors:
  filter/drop_path_datapoints:
    error_mode: ignore
    metrics:
      datapoint:
        - 'attributes["path"] != nil'
```

## Monitoring Cardinality

Track how close you are to the limit in your backend:

```yaml
# Optional: enable detailed Collector internal metrics for Collector pipelines
service:
  telemetry:
    metrics:
      level: detailed
```

```promql
# Check cardinality per metric
count by (__name__) ({__name__=~"http.*"})

# Alert when a metric approaches the default SDK limit
count by (__name__) ({__name__="http_requests_total"}) > 1500
```

The cardinality cap exists to protect your application from unbounded memory growth. Before increasing it, always ask whether you genuinely need that many unique time series. In most cases, reducing cardinality through attribute normalization is the better approach.
