# How to Write a Custom Metric View That Controls Aggregation Boundaries for Your Business Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Metric Views, Aggregation, Custom SDK, Metrics

Description: Write custom OpenTelemetry metric views to control aggregation boundaries, histogram buckets, and attribute filtering for your business metrics.

By default, OpenTelemetry metrics use sensible aggregation settings. But "sensible" for generic metrics is not always right for your business metrics. A histogram tracking payment amounts needs different bucket boundaries than one tracking HTTP latencies. A counter tracking API calls might have high-cardinality attributes you want to drop before export. Metric views give you precise control over how metrics are aggregated.

## What Are Views?

Views are rules that match specific metrics and override their aggregation settings. You can use views to:

- Change histogram bucket boundaries
- Drop attributes to reduce cardinality
- Change the aggregation type (e.g., from histogram to sum)
- Rename metrics
- Drop metrics entirely

## Python: Custom Histogram Buckets

The default histogram buckets are designed for HTTP latency in seconds: `[0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000]`. These make no sense for a metric tracking order values in dollars.

```python
# views.py
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.metrics.view import View, ExplicitBucketHistogramAggregation
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# View 1: Custom buckets for payment amounts
payment_amount_view = View(
    instrument_name="payment.amount",
    aggregation=ExplicitBucketHistogramAggregation(
        # Bucket boundaries in dollars, tuned for our business
        boundaries=[1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000, 10000]
    ),
)

# View 2: Custom buckets for API latency in milliseconds
api_latency_view = View(
    instrument_name="http.server.duration",
    aggregation=ExplicitBucketHistogramAggregation(
        # Focused on the range that matters for our SLO
        boundaries=[5, 10, 25, 50, 100, 200, 500, 1000, 2000, 5000]
    ),
)

# View 3: Custom buckets for queue processing time
queue_latency_view = View(
    instrument_name="queue.processing.duration",
    aggregation=ExplicitBucketHistogramAggregation(
        # Queue jobs can take much longer
        boundaries=[100, 500, 1000, 5000, 10000, 30000, 60000, 300000]
    ),
)

# Register all views with the MeterProvider
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://localhost:4317"),
    export_interval_millis=10000,
)

provider = MeterProvider(
    metric_readers=[reader],
    views=[
        payment_amount_view,
        api_latency_view,
        queue_latency_view,
    ],
)
```

## Dropping High-Cardinality Attributes

Some metrics have attributes that create too many time series. A common example is including `user.id` on a request counter, which creates a separate time series per user:

```python
from opentelemetry.sdk.metrics.view import View

# Drop user.id from the request counter to reduce cardinality
# Only keep the attributes we actually need for dashboards
request_counter_view = View(
    instrument_name="http.server.request.count",
    # Only keep these attributes, drop everything else
    attribute_keys=["http.method", "http.route", "http.status_code"],
)

# Drop all attributes from a simple uptime gauge
uptime_view = View(
    instrument_name="process.uptime",
    attribute_keys=[],  # No attributes, just the value
)
```

## Wildcard Matching

Views support wildcard patterns to match multiple metrics at once:

```python
# Apply the same bucket boundaries to all duration histograms
all_duration_view = View(
    instrument_name="*.duration",
    aggregation=ExplicitBucketHistogramAggregation(
        boundaries=[10, 50, 100, 250, 500, 1000, 2500, 5000]
    ),
)

# Drop user.id from all metrics
drop_user_id_view = View(
    instrument_name="*",
    attribute_keys={
        "http.method", "http.route", "http.status_code",
        "service.name", "deployment.environment",
    },
)
```

## Dropping Unwanted Metrics

Sometimes instrumentation libraries produce metrics you do not need. Use a view to drop them:

```python
from opentelemetry.sdk.metrics.view import View, DropAggregation

# Drop the runtime GC metrics we don't care about
drop_gc_view = View(
    instrument_name="process.runtime.gc.*",
    aggregation=DropAggregation(),
)

# Drop verbose HTTP client metrics
drop_http_client_view = View(
    instrument_name="http.client.*",
    aggregation=DropAggregation(),
)
```

## Java: Custom Views

```java
// MetricViewConfig.java
import io.opentelemetry.sdk.metrics.SdkMeterProvider;
import io.opentelemetry.sdk.metrics.InstrumentSelector;
import io.opentelemetry.sdk.metrics.View;
import io.opentelemetry.sdk.metrics.Aggregation;

SdkMeterProvider meterProvider = SdkMeterProvider.builder()
    // Custom buckets for payment amounts
    .registerView(
        InstrumentSelector.builder()
            .setName("payment.amount")
            .build(),
        View.builder()
            .setAggregation(Aggregation.explicitBucketHistogram(
                List.of(1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 500.0, 1000.0, 5000.0)
            ))
            .build()
    )
    // Drop high-cardinality attributes from request counter
    .registerView(
        InstrumentSelector.builder()
            .setName("http.server.request.count")
            .build(),
        View.builder()
            .setAttributeFilter(key ->
                Set.of("http.method", "http.route", "http.status_code").contains(key)
            )
            .build()
    )
    // Drop metrics we don't need
    .registerView(
        InstrumentSelector.builder()
            .setName("process.runtime.jvm.gc.*")
            .build(),
        View.builder()
            .setAggregation(Aggregation.drop())
            .build()
    )
    .addMetricReader(periodicReader)
    .build();
```

## Full Example: Business Metrics with Views

```python
# business_metrics.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import View, ExplicitBucketHistogramAggregation
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Define views for our business metrics
views = [
    # Order value histogram with dollar-based buckets
    View(
        instrument_name="order.value",
        aggregation=ExplicitBucketHistogramAggregation(
            boundaries=[10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
        ),
        # Only keep these attributes for this metric
        attribute_keys=["payment.method", "order.type", "customer.tier"],
    ),

    # API response time with SLO-focused buckets
    View(
        instrument_name="api.response_time",
        aggregation=ExplicitBucketHistogramAggregation(
            boundaries=[50, 100, 200, 300, 500, 1000, 2000]
        ),
        attribute_keys=["api.endpoint", "api.method", "api.status"],
    ),
]

# Set up the meter provider with views
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://localhost:4317"),
    export_interval_millis=10000,
)

provider = MeterProvider(metric_readers=[reader], views=views)
metrics.set_meter_provider(provider)

# Create metrics
meter = metrics.get_meter("my-service")

order_value = meter.create_histogram(
    name="order.value",
    description="Value of processed orders in dollars",
    unit="USD",
)

api_response_time = meter.create_histogram(
    name="api.response_time",
    description="API endpoint response time",
    unit="ms",
)

# Record metrics - the views control how they get aggregated
def process_order(order):
    order_value.record(
        order.total,
        attributes={
            "payment.method": order.payment_method,
            "order.type": order.type,
            "customer.tier": order.customer.tier,
            "customer.id": order.customer.id,  # This gets dropped by the view
        },
    )
```

## Wrapping Up

Metric views are the SDK-level mechanism for controlling how your metrics get aggregated before export. Use them to set histogram boundaries that match your data distribution, drop high-cardinality attributes that create cardinality explosions, and eliminate metrics you do not need. Define views early in your observability setup because changing aggregation boundaries after the fact means losing historical comparability.
