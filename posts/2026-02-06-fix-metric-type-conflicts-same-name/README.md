# How to Fix Metric Type Conflicts When Two Instruments Register the Same Metric

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Metric, Instrument Types, SDK

Description: Resolve metric type conflicts that occur when two instruments register the same metric name with incompatible types.

You are collecting metrics from your application, but some metrics are missing or returning unexpected values. The SDK logs show a warning about a metric name being registered with conflicting types. This happens when two parts of your code using the same Meter create instruments with the same name but different identifying fields, like a Counter and a Histogram both named `request.count`.

## Understanding the Problem

The OpenTelemetry Metrics SDK treats duplicate instrument registration as an error when more than one instrument with the same name is created for identical Meters from the same MeterProvider but the instruments have different identifying fields, such as the instrument kind. If you register a Counter named `http.requests` and a Histogram also named `http.requests` on the same Meter, the SDK cannot export them as a single unambiguous metric stream unless you correct the conflict with a View.

```python
from opentelemetry import metrics

meter = metrics.get_meter("my-service")

# First registration: Counter

request_counter = meter.create_counter(
    name="http.requests",
    description="Total HTTP requests",
)

# Second registration: Histogram (CONFLICT!)
request_histogram = meter.create_histogram(
    name="http.requests",  # Same name, different type
    description="HTTP request duration",
)
```

The SDK should return functional instruments and log a warning unless the conflict is corrected with a View. Downstream exporters or backends may still treat the duplicate metric identity as a semantic error.

## Detecting the Conflict

Enable SDK logging to see the warnings:

```python
import logging
logging.basicConfig(level=logging.WARNING)

# You will see something like:
# WARNING opentelemetry.sdk.metrics._internal: Instrument http.requests has been
# registered with a different type. Previous: Counter, Current: Histogram
```

For Go:

```go
// Set up the OTel error handler
import (
    "log"

    "go.opentelemetry.io/otel"
)

otel.SetErrorHandler(otel.ErrorHandlerFunc(func(err error) {
    log.Printf("OTel error: %v", err)
}))
```

For Java, check the logs for:

```text
WARNING: Metric name http.requests has already been registered with a different type
```

## Common Scenarios That Cause This

### Scenario 1: Library and Application Code Clash

A third-party library registers a metric, and your application registers one with the same name on the same Meter:

```python
# Library code (you do not control this)
library_meter = metrics.get_meter("shared-meter")
library_counter = library_meter.create_counter("request.count")

# Your code
app_meter = metrics.get_meter("shared-meter")
app_histogram = app_meter.create_histogram("request.count")  # Conflict!
```

If the library and your application use distinct Meters, the SDK treats those Meters as separate namespaces for duplicate instrument detection.

### Scenario 2: Different Modules Using the Same Name

```python
meter = metrics.get_meter("my-service")

# In module A
errors = meter.create_counter("errors")

# In module B
errors = meter.create_up_down_counter("errors")  # Conflict!
```

### Scenario 3: Auto-Instrumentation Conflicts

Auto-instrumentation libraries register their own metrics. If your code uses the same names, you get conflicts.

## Fix 1: Use Unique, Namespaced Metric Names

Follow the OpenTelemetry naming conventions and namespace your metrics:

```python
meter = metrics.get_meter("my-service")

# Use dotted namespace prefixes
request_counter = meter.create_counter(
    name="myservice.http.request.count",    # Namespaced
    description="Total HTTP requests",
    unit="1",
)

request_duration = meter.create_histogram(
    name="myservice.http.request.duration",  # Different name for different purpose
    description="HTTP request duration",
    unit="s",
)
```

## Fix 2: Use Views to Resolve Conflicts

The OpenTelemetry Metrics SDK supports Views, which can rename or reconfigure instruments:

```python
from opentelemetry.sdk.metrics import Histogram, MeterProvider
from opentelemetry.sdk.metrics.view import View

# Rename the conflicting instrument using a View
provider = MeterProvider(
    views=[
        # Rename the histogram to avoid the conflict
        View(
            instrument_name="http.requests",
            instrument_type=Histogram,
            name="http.request.duration",  # Rename to a non-conflicting name
        ),
    ],
)
```

For Go:

```go
import (
    "go.opentelemetry.io/otel/sdk/metric"
)

provider := metric.NewMeterProvider(
    metric.WithView(
        metric.NewView(
            metric.Instrument{
                Name: "http.requests",
                Kind: metric.InstrumentKindHistogram,
            },
            metric.Stream{
                Name: "http.request.duration",  // Renamed
            },
        ),
    ),
)
```

## Fix 3: Check Auto-Instrumentation Metric Names

Before naming your metrics, check what names auto-instrumentation uses:

```bash
# Common auto-instrumentation metric names:
# http.server.request.duration (histogram)
# http.server.active_requests (up-down counter)
# http.client.request.duration (histogram)
# rpc.server.call.duration (histogram)
# db.client.operation.duration (histogram)
```

Avoid using these exact names for your custom metrics.

## Fix 4: Use the Collector to Rename at Export Time

If you cannot change the source code, use the Collector's metrics transform processor to rename exported metrics before they reach your backend:

```yaml
processors:
  metrics_transform:
    transforms:
      - include: "http.requests"
        match_type: strict
        action: update
        new_name: "http.request.count"
```

This does not prevent the SDK from warning about duplicate instrument registration. It only changes metric names after the Collector receives them.

## Verification

After fixing the conflict, verify that both metrics are being exported correctly:

```yaml
# Collector debug exporter
exporters:
  debug:
    verbosity: detailed

# Check for both metrics in the output
# Both should appear with their correct types
```

```bash
# Check the SDK metrics endpoint if using Prometheus
curl http://localhost:9464/metrics | grep http.request
```

Metric type conflicts can become data quality issues if you do not notice the SDK warnings or backend errors. Always follow the OpenTelemetry semantic conventions for naming, use namespace prefixes for custom metrics, and check auto-instrumentation metric names before creating your own.
