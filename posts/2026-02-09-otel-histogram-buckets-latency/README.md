# How to configure OpenTelemetry histogram buckets for latency tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Histograms, Latency, Metrics, Performance

Description: Learn how to configure OpenTelemetry histogram bucket boundaries for accurate latency tracking and performance analysis with appropriate granularity for your application needs.

---

Histogram buckets determine how OpenTelemetry aggregates latency measurements. Proper bucket configuration ensures accurate percentile calculations and meaningful performance insights without excessive cardinality.

## Understanding Histogram Buckets

Histograms distribute measurements into predefined buckets. Each bucket counts values within a range. The bucket boundaries determine the precision of percentile calculations. Poor bucket selection leads to inaccurate or useless metrics.

OpenTelemetry uses exponential histograms by default, which provide good general-purpose coverage. However, custom buckets often provide better insights for specific latency patterns in your application.

## Default Bucket Configuration

OpenTelemetry SDKs come with default histogram buckets suitable for general latency tracking.

```python
# default_histograms.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Configure with defaults
exporter = OTLPMetricExporter(endpoint="http://localhost:4317")
reader = PeriodicExportingMetricReader(exporter)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter(__name__)

# Create histogram with default buckets
# Default: [0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000]
request_duration = meter.create_histogram(
    name="http.server.duration",
    description="HTTP request duration in milliseconds",
    unit="ms",
)

# Record latencies
request_duration.record(45.2, {"endpoint": "/api/users"})
request_duration.record(123.5, {"endpoint": "/api/orders"})
request_duration.record(1520.8, {"endpoint": "/api/reports"})
```

## Custom Bucket Boundaries

Define custom bucket boundaries tailored to your application's latency characteristics.

```python
# custom_buckets.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import View
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.metrics.aggregation import ExplicitBucketHistogramAggregation

# Define custom buckets for API latency (in milliseconds)
api_latency_buckets = [10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 2000, 5000]

# Create view with custom buckets
api_latency_view = View(
    instrument_name="http.server.duration",
    aggregation=ExplicitBucketHistogramAggregation(boundaries=api_latency_buckets),
)

# Configure meter provider with custom view
exporter = OTLPMetricExporter(endpoint="http://localhost:4317")
reader = PeriodicExportingMetricReader(exporter)
provider = MeterProvider(metric_readers=[reader], views=[api_latency_view])
metrics.set_meter_provider(provider)

meter = metrics.get_meter(__name__)

# Create histogram - uses custom buckets from view
request_duration = meter.create_histogram(
    name="http.server.duration",
    description="HTTP request duration",
    unit="ms",
)
```

## Buckets for Fast Operations

Configure fine-grained buckets for low-latency operations like cache lookups.

```python
# fast_operation_buckets.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import View
from opentelemetry.sdk.metrics.aggregation import ExplicitBucketHistogramAggregation
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Fine-grained buckets for cache operations (microseconds)
cache_buckets = [0.1, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]

# Create view for cache latency
cache_view = View(
    instrument_name="cache.operation.duration",
    aggregation=ExplicitBucketHistogramAggregation(boundaries=cache_buckets),
)

exporter = OTLPMetricExporter(endpoint="http://localhost:4317")
reader = PeriodicExportingMetricReader(exporter)
provider = MeterProvider(metric_readers=[reader], views=[cache_view])
metrics.set_meter_provider(provider)

meter = metrics.get_meter(__name__)

# Track cache operations
cache_duration = meter.create_histogram(
    name="cache.operation.duration",
    description="Cache operation duration",
    unit="ms",
)

def get_from_cache(key):
    import time
    start = time.time()
    
    # Cache lookup
    value = perform_cache_lookup(key)
    
    duration_ms = (time.time() - start) * 1000
    cache_duration.record(duration_ms, {"operation": "get", "hit": value is not None})
    
    return value

def perform_cache_lookup(key):
    return "cached_value"
```

## Buckets for Slow Operations

Use coarse-grained buckets for long-running operations like batch processing.

```python
# slow_operation_buckets.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics.view import View
from opentelemetry.sdk.metrics.aggregation import ExplicitBucketHistogramAggregation

# Coarse buckets for batch jobs (seconds)
batch_buckets = [1, 5, 10, 30, 60, 120, 300, 600, 1200, 1800, 3600]

batch_view = View(
    instrument_name="batch.job.duration",
    aggregation=ExplicitBucketHistogramAggregation(boundaries=batch_buckets),
)

# Track batch processing
meter = metrics.get_meter(__name__)
batch_duration = meter.create_histogram(
    name="batch.job.duration",
    description="Batch job duration",
    unit="s",
)

def process_batch(items):
    import time
    start = time.time()
    
    # Process items
    for item in items:
        process_item(item)
    
    duration_s = time.time() - start
    batch_duration.record(
        duration_s,
        {"batch.size": len(items), "batch.type": "order_processing"}
    )

def process_item(item):
    pass
```

## Database Query Buckets

Configure buckets appropriate for database query latencies.

```python
# database_buckets.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics.view import View
from opentelemetry.sdk.metrics.aggregation import ExplicitBucketHistogramAggregation

# Database query buckets (milliseconds)
# Most queries under 100ms, some up to 5 seconds
db_query_buckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]

db_view = View(
    instrument_name="db.query.duration",
    aggregation=ExplicitBucketHistogramAggregation(boundaries=db_query_buckets),
)

meter = metrics.get_meter(__name__)
query_duration = meter.create_histogram(
    name="db.query.duration",
    description="Database query duration",
    unit="ms",
)

def execute_query(sql, params):
    import time
    start = time.time()
    
    # Execute query
    result = run_query(sql, params)
    
    duration_ms = (time.time() - start) * 1000
    query_duration.record(
        duration_ms,
        {
            "db.system": "postgresql",
            "db.operation": get_operation_type(sql),
            "db.table": extract_table_name(sql),
        }
    )
    
    return result

def run_query(sql, params):
    return []

def get_operation_type(sql):
    return sql.split()[0].upper()

def extract_table_name(sql):
    return "users"
```

## Service-Specific Bucket Configuration

Configure different bucket sets for different services or endpoints.

```python
# service_specific_buckets.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import View
from opentelemetry.sdk.metrics.aggregation import ExplicitBucketHistogramAggregation
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Fast API endpoints (< 200ms expected)
fast_api_buckets = [10, 20, 30, 50, 75, 100, 150, 200, 300, 500]

# Slow API endpoints (< 2s expected)
slow_api_buckets = [100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000]

# Create views for different endpoint types
fast_api_view = View(
    instrument_name="http.server.duration",
    instrument_unit="ms",
    aggregation=ExplicitBucketHistogramAggregation(boundaries=fast_api_buckets),
    attribute_keys={"http.route"},  # Only include route attribute
)

# Configure provider with views
exporter = OTLPMetricExporter(endpoint="http://localhost:4317")
reader = PeriodicExportingMetricReader(exporter)
provider = MeterProvider(metric_readers=[reader], views=[fast_api_view])
metrics.set_meter_provider(provider)
```

## Calculating Percentiles from Buckets

Understand how bucket configuration affects percentile accuracy.

```python
# percentile_calculation.py
"""
Example bucket boundaries and percentile accuracy:

Buckets: [10, 50, 100, 500, 1000]
- If 95th percentile falls between 100-500ms,
  you only know p95 is somewhere in that range
- More buckets = better percentile accuracy

Good bucket distribution:
- Dense buckets where most values fall
- Sparse buckets at extremes

Example for API targeting < 100ms:
[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200, 500, 1000]
- 10ms granularity in the 0-100ms range (most traffic)
- Coarser granularity above 100ms (outliers)
"""

# Configure buckets based on SLA
def create_sla_based_buckets(sla_target_ms, num_buckets_below_sla=10):
    """Create buckets with fine granularity near SLA target"""
    step = sla_target_ms / num_buckets_below_sla
    
    buckets = []
    
    # Fine-grained buckets up to SLA
    for i in range(1, num_buckets_below_sla + 1):
        buckets.append(step * i)
    
    # Coarse-grained buckets above SLA
    buckets.extend([
        sla_target_ms * 1.5,
        sla_target_ms * 2,
        sla_target_ms * 5,
        sla_target_ms * 10,
    ])
    
    return buckets

# For 100ms SLA
api_buckets = create_sla_based_buckets(100)
print(f"API buckets: {api_buckets}")
# Output: [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0, 150.0, 200.0, 500.0, 1000.0]
```

## Exponential Buckets

Use exponentially distributed buckets for wide latency ranges.

```python
# exponential_buckets.py
from opentelemetry.sdk.metrics.aggregation import ExplicitBucketHistogramAggregation

def create_exponential_buckets(start, factor, num_buckets):
    """Create exponentially distributed buckets"""
    buckets = []
    current = start
    
    for _ in range(num_buckets):
        buckets.append(current)
        current *= factor
    
    return buckets

# Example: Start at 10ms, multiply by 2, create 12 buckets
# Results in: [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120, 10240, 20480]
exp_buckets = create_exponential_buckets(10, 2, 12)

exp_view = View(
    instrument_name="service.operation.duration",
    aggregation=ExplicitBucketHistogramAggregation(boundaries=exp_buckets),
)
```

## Monitoring Bucket Distribution

Track which buckets receive the most observations to validate configuration.

```python
# bucket_monitoring.py
"""
Check histogram bucket distribution in your backend:

In Prometheus/Grafana, query:
  histogram_quantile(0.50, http_server_duration_bucket)
  histogram_quantile(0.95, http_server_duration_bucket)
  histogram_quantile(0.99, http_server_duration_bucket)

If percentiles show:
- p95 and p99 in same bucket -> needs more granularity
- Most observations in first bucket -> lower boundary needed
- Most observations in last bucket -> higher boundary needed

Adjust buckets iteratively based on actual data.
"""
```

## Best Practices

Follow these best practices for histogram bucket configuration.

First, analyze actual latency distributions before setting buckets. Use percentiles from existing monitoring to inform bucket boundaries.

Second, place more buckets where most values fall. If 90% of requests are under 100ms, use fine-grained buckets in that range.

Third, include buckets slightly above your SLA targets. This helps identify when performance approaches limits.

Fourth, limit the number of buckets to avoid excessive cardinality. Typically 10-20 buckets provide good accuracy without explosion.

Fifth, use the same buckets across similar services. Consistency enables easier comparison and aggregation.

OpenTelemetry histogram buckets determine the accuracy of latency metrics and percentile calculations. Proper bucket configuration balances precision against cardinality to provide meaningful performance insights aligned with your application's actual behavior and SLA requirements.
