# How to Calculate Error Budgets from OpenTelemetry Span Metrics (Error Rate, Success Rate, SLO Burn)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Error Budgets, SLO, Metrics

Description: Calculate error budgets from OpenTelemetry span metrics including error rate, success rate, and SLO burn rate tracking.

Error budgets are at the core of SRE practice. They answer the question "how many errors can we tolerate before our users notice?" OpenTelemetry span metrics give you everything you need to calculate error budgets without any additional tooling. This post walks through computing error rates, success rates, and SLO burn rates directly from OpenTelemetry span data.

## The Basics: Error Rate from Spans

Every completed span in OpenTelemetry has a status code: `UNSET`, `OK`, or `ERROR`. By counting error spans versus total spans, you get your error rate. The OpenTelemetry SDK can generate these metrics automatically using the span metrics connector in the OpenTelemetry Collector, but you can also compute them in application code.

```python
# error_budget.py - Calculate error budgets from OpenTelemetry span metrics
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Set up the meter provider
exporter = OTLPMetricExporter(endpoint="http://localhost:4317")
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=10000)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("error-budget-calculator")

# Create counters for tracking request outcomes
total_requests = meter.create_counter(
    name="http.server.request.total",
    description="Total number of HTTP requests",
    unit="1",
)

error_requests = meter.create_counter(
    name="http.server.request.errors",
    description="Total number of HTTP requests that resulted in errors",
    unit="1",
)

# Create an observable gauge for the current error budget remaining
error_budget_state = {"total": 0, "errors": 0}

def error_budget_callback(options):
    """Calculate remaining error budget as a percentage."""
    total = error_budget_state["total"]
    errors = error_budget_state["errors"]

    if total == 0:
        return [metrics.Observation(100.0)]

    slo_target = 0.995  # 99.5% availability target
    error_budget_total = (1 - slo_target) * total
    error_budget_remaining = max(0, error_budget_total - errors)

    if error_budget_total == 0:
        return [metrics.Observation(100.0)]

    remaining_pct = (error_budget_remaining / error_budget_total) * 100
    return [metrics.Observation(remaining_pct)]

error_budget_gauge = meter.create_observable_gauge(
    name="slo.error_budget.remaining_percent",
    description="Percentage of error budget remaining",
    unit="%",
    callbacks=[error_budget_callback],
)
```

## Recording Span Outcomes

Integrate the counters into your request handling:

```python
# middleware.py - Record request outcomes for error budget tracking
from opentelemetry import trace

def track_request_outcome(span):
    """
    Call this when a request span completes.
    Updates the error budget counters.
    """
    attributes = {
        "service.name": "my-api",
        "http.method": span.attributes.get("http.method", "UNKNOWN"),
        "http.route": span.attributes.get("http.route", "UNKNOWN"),
    }

    total_requests.add(1, attributes)
    error_budget_state["total"] += 1

    if span.status.status_code == trace.StatusCode.ERROR:
        error_requests.add(1, attributes)
        error_budget_state["errors"] += 1
```

## Calculating SLO Burn Rate

The burn rate tells you how fast you are consuming your error budget. A burn rate of 1.0 means you are consuming budget at exactly the rate that would exhaust it by the end of the window. A burn rate of 2.0 means you are burning twice as fast.

```python
# burn_rate.py - Calculate SLO burn rate from span metrics
import time

class BurnRateCalculator:
    """
    Calculates SLO burn rate over a sliding time window.
    Uses OpenTelemetry span outcome data.
    """

    def __init__(self, slo_target=0.995, window_seconds=3600):
        self.slo_target = slo_target
        self.window_seconds = window_seconds
        self.slo_window_seconds = 30 * 24 * 3600  # 30-day SLO window
        self.events = []  # List of (timestamp, is_error) tuples

    def record(self, is_error):
        """Record a request outcome."""
        now = time.time()
        self.events.append((now, is_error))
        # Prune old events outside the window
        cutoff = now - self.window_seconds
        self.events = [(t, e) for t, e in self.events if t >= cutoff]

    def current_burn_rate(self):
        """
        Calculate the current burn rate.
        burn_rate = (error_rate_in_window / allowed_error_rate)
        """
        if not self.events:
            return 0.0

        total = len(self.events)
        errors = sum(1 for _, is_error in self.events if is_error)

        # Current error rate in the window
        current_error_rate = errors / total if total > 0 else 0

        # Allowed error rate based on SLO target
        allowed_error_rate = 1 - self.slo_target

        if allowed_error_rate == 0:
            return float("inf") if current_error_rate > 0 else 0.0

        return current_error_rate / allowed_error_rate

    def time_until_budget_exhausted(self):
        """
        Estimate time until error budget is fully consumed
        at the current burn rate.
        """
        burn_rate = self.current_burn_rate()
        if burn_rate <= 0:
            return float("inf")

        # Time remaining = SLO window remaining / burn_rate
        return self.slo_window_seconds / burn_rate


# Usage example
calculator = BurnRateCalculator(slo_target=0.999, window_seconds=3600)

# Simulate some requests
for i in range(1000):
    is_error = (i % 100 == 0)  # 1% error rate
    calculator.record(is_error)

burn_rate = calculator.current_burn_rate()
print(f"Current burn rate: {burn_rate:.2f}x")
print(f"Budget exhausted in: {calculator.time_until_budget_exhausted() / 3600:.1f} hours")
```

## Querying Error Budgets with PromQL

If you export OpenTelemetry metrics to Prometheus, you can compute error budgets using PromQL:

```promql
# Error rate over the last hour
sum(rate(http_server_request_errors_total[1h]))
/
sum(rate(http_server_request_total[1h]))

# SLO burn rate (for 99.9% SLO)
(
  sum(rate(http_server_request_errors_total[1h]))
  /
  sum(rate(http_server_request_total[1h]))
)
/
0.001

# Error budget remaining (30-day window)
1 - (
  sum(increase(http_server_request_errors_total[30d]))
  /
  (sum(increase(http_server_request_total[30d])) * 0.001)
)
```

## Setting Up Multi-Window Burn Rate Alerts

Google's SRE book recommends multi-window burn rate alerts. Here is a practical Prometheus alerting rule:

```yaml
# alerts.yaml - Multi-window burn rate alerts
groups:
  - name: slo-burn-rate
    rules:
      # Fast burn: high error rate over a short window
      - alert: HighBurnRate_Fast
        expr: |
          (
            sum(rate(http_server_request_errors_total{service="my-api"}[5m]))
            / sum(rate(http_server_request_total{service="my-api"}[5m]))
          ) / 0.001 > 14.4
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error budget burning 14.4x faster than allowed"

      # Slow burn: sustained elevated error rate
      - alert: HighBurnRate_Slow
        expr: |
          (
            sum(rate(http_server_request_errors_total{service="my-api"}[6h]))
            / sum(rate(http_server_request_total{service="my-api"}[6h]))
          ) / 0.001 > 1
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Error budget consumption rate is unsustainable"
```

## Conclusion

Error budgets calculated from OpenTelemetry span metrics give you a quantitative framework for reliability decisions. Instead of arguing about whether a 0.5% error rate is acceptable, you can see exactly how fast your budget is burning and how much remains. This data-driven approach keeps both engineering velocity and reliability in balance.
