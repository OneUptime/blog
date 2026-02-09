# How to Fix Metric Type Conflicts When Two Instruments Register the Same Metric Name with Different Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Metrics, Instrument Types, SDK

Description: Resolve metric type conflicts that occur when two instruments register the same metric name with incompatible types.

You are collecting metrics from your application, but some metrics are missing or returning unexpected values. The SDK logs show a warning about a metric name being registered with conflicting types. This happens when two parts of your code (or a library and your code) create instruments with the same name but different types, like a Counter and a Histogram both named `request.count`.

## Understanding the Problem

The OpenTelemetry Metrics SDK enforces a rule: each metric name must map to exactly one instrument type. If you register a Counter named `http.requests` and a Histogram also named `http.requests`, the SDK cannot reconcile them and one will be dropped or ignored.

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

The SDK will log a warning and typically return the first registered instrument for subsequent registrations.

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
import "go.opentelemetry.io/otel"

otel.SetErrorHandler(otel.ErrorHandlerFunc(func(err error) {
    log.Printf("OTel error: %v", err)
}))
```

For Java, check the logs for:

```
WARNING: Metric name http.requests has already been registered with a different type
```

## Common Scenarios That Cause This

### Scenario 1: Library and Application Code Clash

A third-party library registers a metric, and your application registers one with the same name:

```python
# Library code (you do not control this)
library_meter = metrics.get_meter("some-library")
library_counter = library_meter.create_counter("request.count")

# Your code
app_meter = metrics.get_meter("my-app")
app_histogram = app_meter.create_histogram("request.count")  # Conflict!
```

### Scenario 2: Different Modules Using the Same Name

```python
# In module A
meter = metrics.get_meter("module-a")
errors = meter.create_counter("errors")

# In module B
meter = metrics.get_meter("module-b")
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
    unit="ms",
)
```

## Fix 2: Use Views to Resolve Conflicts

The OpenTelemetry Metrics SDK supports Views, which can rename or reconfigure instruments:

```python
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import View

# Rename the conflicting instrument using a View
provider = MeterProvider(
    views=[
        # Rename the histogram to avoid the conflict
        View(
            instrument_name="http.requests",
            instrument_type=metrics.Histogram,
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
# rpc.server.duration (histogram)
# db.client.operation.duration (histogram)
```

Avoid using these exact names for your custom metrics.

## Fix 4: Use the Collector to Resolve at Export Time

If you cannot change the source code, use the Collector's metrics transform processor to rename metrics:

```yaml
processors:
  metricstransform:
    transforms:
      - include: "http.requests"
        match_type: strict
        action: update
        new_name: "http.request.count"
```

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

Metric type conflicts are silent data loss unless you have logging enabled. Always follow the OpenTelemetry semantic conventions for naming, use namespace prefixes for custom metrics, and check auto-instrumentation metric names before creating your own.
