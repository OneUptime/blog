# How to Use Uptrends Synthetic Monitoring with OpenTelemetry for Real-Browser

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Uptrends, Synthetic Monitoring, Real Browser Testing, Performance

Description: Integrate Uptrends synthetic monitoring with OpenTelemetry to combine real-browser test results with backend trace data for complete visibility.

Uptrends provides real-browser synthetic monitoring from locations around the world. It loads your pages in Chrome browsers and measures timing, rendering, and availability. By exporting Uptrends test results with OpenTelemetry and propagating Uptrends' correlation ID through your backend, you can see what happens server-side when a synthetic check reports slow performance from Tokyo or Frankfurt.

## Why Real-Browser Synthetic Monitoring Matters

HTTP-level synthetic checks (just hitting an endpoint and measuring response time) miss a lot. They do not render JavaScript, they do not load images, and they do not execute client-side code. Real-browser checks run your full page in Chrome, giving you the same kind of performance data that real users experience. Uptrends runs these checks from dozens of global locations, so you can catch performance issues that only affect specific regions.

## Setting Up Uptrends Checks

Configure an Uptrends transaction monitor that exercises the user journey you want to measure. A transaction monitor is built from page interaction actions such as Navigate and Click, plus wait or content-check actions that make the script resilient:

```yaml
# Example Uptrends transaction outline
steps:
  - name: Product list
    actions:
      - type: Navigate
        url: https://myapp.com/products
      - type: Content check
        selector: css=#product-list

  - name: Product detail
    actions:
      - type: Click
        selector: css=.product-card:first-child
        wait_until: element is visible and enabled
      - type: Content check
        selector: css=#product-detail

  - name: Add to cart
    actions:
      - type: Click
        selector: css=#add-to-cart-button
        wait_until: element is visible and enabled
      - type: Content check
        selector: css=.cart-notification
```

For trace correlation, your application should read the `X-Correlation-ID` HTTP header sent by Uptrends and add it to backend spans or logs. Do not rely on extracting a backend trace ID from the rendered page; Uptrends' documented OpenTelemetry flow uses a correlation ID per synthetic check.

```python
# Flask example: attach Uptrends correlation ID to the active span
from flask import Flask, request
from opentelemetry import trace

app = Flask(__name__)

@app.before_request
def add_uptrends_correlation_id():
    correlation_id = request.headers.get("X-Correlation-ID")
    if correlation_id:
        trace.get_current_span().set_attribute(
            "uptrends.correlation_id",
            correlation_id,
        )
```

## Forwarding Uptrends Results to OpenTelemetry

Uptrends has a first-party OpenTelemetry export for Enterprise-level accounts. Configure an OpenTelemetry connection, rule set, and monitor group in Uptrends, then point the export at a publicly reachable HTTPS OTLP endpoint. Uptrends supports OTLP over gRPC and HTTP/Protobuf.

```yaml
# otel-collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true
  prometheus:
    endpoint: 0.0.0.0:9464

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

In production, terminate TLS at the collector or at a load balancer in front of it, protect the endpoint with the authentication method you configure in Uptrends, and allow inbound traffic from Uptrends.

## Correlating Synthetic Results with Backend Traces

With the correlation ID captured from Uptrends and stored as a span attribute, you can look up backend traces that handled the same synthetic request. If you already know a Tempo trace ID, Tempo exposes `GET /api/traces/<traceID>`:

```python
# correlate_synthetic_trace.py
import requests

TEMPO_URL = "http://tempo:3200"

def get_backend_trace(trace_id):
    """Fetch the backend trace for a specific Tempo trace ID."""
    resp = requests.get(f"{TEMPO_URL}/api/traces/{trace_id}", timeout=10)
    if resp.status_code == 200:
        return resp.json()
    return None

def analyze_trace(trace_id):
    trace_data = get_backend_trace(trace_id)
    if trace_data:
        spans = extract_spans(trace_data)
        sorted_spans = sorted(spans, key=lambda s: s["duration"], reverse=True)
        print("Backend trace breakdown:")
        for span in sorted_spans[:5]:
            print(f"  {span['name']}: {span['duration']:.0f}ms")
```

If you only have the Uptrends correlation ID, search your trace backend by the `uptrends.correlation_id` span attribute and use the returned trace ID for the lookup. The exact search query depends on your trace backend and indexing configuration.

## Building a Unified Dashboard

Create a Grafana dashboard that combines Uptrends synthetic data with backend traces. The exact metric names depend on how your collector and backend translate OpenTelemetry metric names. When metrics are exported to Prometheus, OpenTelemetry metric names are commonly translated to Prometheus naming conventions with underscores and unit or type suffixes.

```promql
# Synthetic page load P95 by location
histogram_quantile(
  0.95,
  sum(rate(synthetic_page_load_duration_milliseconds_bucket[5m])) by (le, check_location_city)
)

# TTFB from synthetic checks vs backend P95
# Panel A: Synthetic TTFB
histogram_quantile(
  0.95,
  sum(rate(synthetic_ttfb_duration_milliseconds_bucket[5m])) by (le, check_location_city)
)
# Panel B: Backend response time P95
histogram_quantile(0.95, sum(rate(http_server_duration_seconds_bucket[5m])) by (le))

# Synthetic check pass rate by location
sum(rate(synthetic_check_total{check_status="pass"}[5m])) by (check_location_country)
/
sum(rate(synthetic_check_total[5m])) by (check_location_country)
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
          histogram_quantile(
            0.95,
            sum(rate(synthetic_page_load_duration_milliseconds_bucket[5m])) by (le, check_location_country)
          ) > 5000
        for: 15m
        annotations:
          summary: "Page load time exceeds 5s from {{ $labels.check_location_country }}"

      - alert: SyntheticCheckHighTTFB
        expr: |
          histogram_quantile(
            0.95,
            sum(rate(synthetic_ttfb_duration_milliseconds_bucket[5m])) by (le, check_location_city)
          ) > 1000
          and
          histogram_quantile(0.95, sum(rate(http_server_duration_seconds_bucket[5m])) by (le)) < 0.2
        for: 10m
        annotations:
          summary: "High TTFB from {{ $labels.check_location_city }} but backend is fast - possible network/CDN issue"
```

## Wrapping Up

Combining Uptrends real-browser synthetic monitoring with OpenTelemetry backend traces gives you visibility from the user's browser all the way to your database. When a synthetic check from a specific location is slow, you can use the Uptrends correlation ID to find backend spans for the same request and determine whether the server was the bottleneck or if the problem lies in the network path. This eliminates guesswork and speeds up root cause analysis for performance issues that only affect certain regions or user flows.
