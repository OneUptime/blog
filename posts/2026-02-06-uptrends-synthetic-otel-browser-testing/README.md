# How to Use Uptrends Synthetic Monitoring with OpenTelemetry for Real-Browser Performance Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Uptrends, Synthetic Monitoring, Real Browser Testing, Performance

Description: Integrate Uptrends synthetic monitoring with OpenTelemetry to combine real-browser test results with backend trace data for complete visibility.

Uptrends provides real-browser synthetic monitoring from locations around the world. It loads your pages in actual Chrome browsers and measures timing, rendering, and availability. By connecting Uptrends test results with your OpenTelemetry backend traces, you can see exactly what happens server-side when a synthetic check reports slow performance from Tokyo or Frankfurt.

## Why Real-Browser Synthetic Monitoring Matters

HTTP-level synthetic checks (just hitting an endpoint and measuring response time) miss a lot. They do not render JavaScript, they do not load images, and they do not execute client-side code. Real-browser checks run your full page in a headless Chrome instance, giving you the same performance data that real users experience. Uptrends runs these checks from dozens of global locations, so you can catch performance issues that only affect specific regions.

## Setting Up Uptrends Checks

Configure an Uptrends transaction check that captures the trace ID from your backend:

```javascript
// Uptrends transaction script
// Step 1: Navigate to the page
navigate("https://myapp.com/products");

// Step 2: Wait for the main content to load
waitForElement("css=#product-list");

// Step 3: Click on a product
click("css=.product-card:first-child");
waitForElement("css=#product-detail");

// Step 4: Add to cart
click("css=#add-to-cart-button");
waitForElement("css=.cart-notification");

// Step 5: Extract the trace ID from the page for correlation
// Your app should expose this in a meta tag or data attribute
var traceId = getElementAttribute("css=meta[name='server-trace-id']", "content");
setCustomMetric("server_trace_id", traceId);
```

## Forwarding Uptrends Results to OpenTelemetry

Uptrends has a webhook/API that reports check results. Set up a small service that receives these results and converts them to OpenTelemetry metrics:

```python
# uptrends_otel_bridge.py
from flask import Flask, request, jsonify
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Initialize OpenTelemetry metrics
exporter = OTLPMetricExporter(endpoint="otel-collector:4317", insecure=True)
reader = PeriodicExportingMetricReader(exporter)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("uptrends-synthetic")

# Create metrics for Uptrends check results
check_duration = meter.create_histogram(
    "synthetic.check.duration",
    unit="ms",
    description="Total duration of synthetic browser check",
)
dns_duration = meter.create_histogram(
    "synthetic.dns.duration",
    unit="ms",
    description="DNS resolution time",
)
connect_duration = meter.create_histogram(
    "synthetic.connect.duration",
    unit="ms",
    description="TCP connection time",
)
ttfb_duration = meter.create_histogram(
    "synthetic.ttfb.duration",
    unit="ms",
    description="Time to first byte",
)
dom_load_duration = meter.create_histogram(
    "synthetic.dom_load.duration",
    unit="ms",
    description="DOM content loaded time",
)
page_load_duration = meter.create_histogram(
    "synthetic.page_load.duration",
    unit="ms",
    description="Full page load time",
)

app = Flask(__name__)

@app.route("/webhook/uptrends", methods=["POST"])
def receive_uptrends_result():
    data = request.get_json()

    attrs = {
        "check.name": data.get("MonitorName", "unknown"),
        "check.location": data.get("ServerName", "unknown"),
        "check.location.city": data.get("ServerCity", "unknown"),
        "check.location.country": data.get("ServerCountry", "unknown"),
        "check.status": "pass" if data.get("IsUp") else "fail",
        # Link to the backend trace if available
        "server.trace_id": data.get("CustomMetrics", {}).get("server_trace_id", ""),
    }

    # Record all timing phases
    timings = data.get("Timings", {})
    check_duration.record(timings.get("TotalTime", 0), attrs)
    dns_duration.record(timings.get("DnsTime", 0), attrs)
    connect_duration.record(timings.get("ConnectTime", 0), attrs)
    ttfb_duration.record(timings.get("TimeToFirstByte", 0), attrs)
    dom_load_duration.record(timings.get("DomContentLoaded", 0), attrs)
    page_load_duration.record(timings.get("PageLoadTime", 0), attrs)

    return jsonify({"status": "recorded"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

## Correlating Synthetic Results with Backend Traces

With the trace ID captured from Uptrends and stored as a metric attribute, you can look up the corresponding backend trace:

```python
# correlate_synthetic_trace.py
import requests

TEMPO_URL = "http://tempo:3200"
PROMETHEUS_URL = "http://prometheus:9090"

def get_slow_synthetic_checks(min_duration_ms=3000):
    """Find synthetic checks that were slow."""
    query = f'synthetic_check_duration_milliseconds > {min_duration_ms}'
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query})
    results = resp.json().get("data", {}).get("result", [])
    return results

def get_backend_trace(trace_id):
    """Fetch the backend trace for a specific synthetic check."""
    resp = requests.get(f"{TEMPO_URL}/api/traces/{trace_id}")
    if resp.status_code == 200:
        return resp.json()
    return None

def analyze_slow_checks():
    slow_checks = get_slow_synthetic_checks()

    for check in slow_checks:
        location = check["metric"].get("check_location_city", "unknown")
        duration = float(check["value"][1])
        trace_id = check["metric"].get("server_trace_id", "")

        print(f"\nSlow check from {location}: {duration:.0f}ms")

        if trace_id:
            trace_data = get_backend_trace(trace_id)
            if trace_data:
                # Find the slowest spans in the backend trace
                spans = extract_spans(trace_data)
                sorted_spans = sorted(spans, key=lambda s: s["duration"], reverse=True)
                print("  Backend trace breakdown:")
                for span in sorted_spans[:5]:
                    print(f"    {span['name']}: {span['duration']:.0f}ms")
```

## Building a Unified Dashboard

Create a Grafana dashboard that combines Uptrends synthetic data with backend traces:

```promql
# Synthetic page load time by location
avg(synthetic_page_load_duration_milliseconds) by (check_location_city)

# TTFB from synthetic checks vs backend P95
# Panel A: Synthetic TTFB
avg(synthetic_ttfb_duration_milliseconds) by (check_location_city)
# Panel B: Backend response time P95
histogram_quantile(0.95, sum(rate(http_server_duration_seconds_bucket[5m])) by (le))

# Synthetic check pass rate by location
avg(synthetic_check_duration_milliseconds{check_status="pass"}) by (check_location_country)
/
count(synthetic_check_duration_milliseconds) by (check_location_country)
```

## Alerting on Regional Performance Issues

Uptrends data lets you detect regional performance problems:

```yaml
# alerts.yaml
groups:
  - name: synthetic-regional
    rules:
      - alert: RegionalPerformanceDegradation
        expr: |
          avg(synthetic_page_load_duration_milliseconds) by (check_location_country)
          > 5000
        for: 15m
        annotations:
          summary: "Page load time exceeds 5s from {{ $labels.check_location_country }}"

      - alert: SyntheticCheckHighTTFB
        expr: |
          avg(synthetic_ttfb_duration_milliseconds) by (check_location_city) > 1000
          and
          histogram_quantile(0.95, sum(rate(http_server_duration_seconds_bucket[5m])) by (le)) < 0.2
        for: 10m
        annotations:
          summary: "High TTFB from {{ $labels.check_location_city }} but backend is fast - possible network/CDN issue"
```

## Wrapping Up

Combining Uptrends real-browser synthetic monitoring with OpenTelemetry backend traces gives you visibility from the user's browser all the way to your database. When a synthetic check from a specific location is slow, you can immediately look up the backend trace to see if the server was the bottleneck or if the problem lies in the network path. This eliminates guesswork and speeds up root cause analysis for performance issues that only affect certain regions or user flows.
