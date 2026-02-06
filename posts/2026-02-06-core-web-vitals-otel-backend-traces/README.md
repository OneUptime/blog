# How to Correlate Core Web Vitals (LCP, FID, CLS) with Backend OpenTelemetry Traces for Full-Stack Optimization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Core Web Vitals, LCP, FID, CLS, Full-Stack Performance

Description: Correlate Core Web Vitals from the browser with backend OpenTelemetry traces to pinpoint whether slow performance originates on the frontend or backend.

Core Web Vitals measure what users actually experience: how fast the largest element renders (LCP), how responsive the page is to interaction (FID/INP), and how visually stable it is (CLS). But these metrics alone do not tell you why performance is poor. Is LCP slow because the server took too long to respond, or because the browser is struggling with rendering? You need to link frontend vitals with backend traces to get the full answer.

## Capturing Core Web Vitals in the Browser

Use the `web-vitals` library to collect metrics and send them to your OpenTelemetry Collector:

```javascript
// web-vitals-reporter.js
import { onLCP, onFID, onCLS, onTTFB, onINP } from 'web-vitals';

const OTEL_ENDPOINT = '/api/v1/browser-metrics';

function sendMetric(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating, // "good", "needs-improvement", or "poor"
    delta: metric.delta,
    id: metric.id,
    // Include page context
    page: window.location.pathname,
    userAgent: navigator.userAgent,
    // Include the server trace ID if present in the page
    serverTraceId: document.querySelector('meta[name="trace-id"]')?.content || null,
    timestamp: Date.now(),
  });

  // Use sendBeacon for reliability during page unload
  if (navigator.sendBeacon) {
    navigator.sendBeacon(OTEL_ENDPOINT, body);
  } else {
    fetch(OTEL_ENDPOINT, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
  }
}

// Register all vital metric collectors
onLCP(sendMetric);
onFID(sendMetric);
onCLS(sendMetric);
onTTFB(sendMetric);
onINP(sendMetric);
```

## Injecting the Trace ID into the Page

The critical link between frontend and backend is the trace ID. Embed it in your HTML response so the browser can attach it when reporting vitals:

```javascript
// server/render-middleware.js
const { trace } = require('@opentelemetry/api');

function injectTraceId(req, res, next) {
  const originalRender = res.render.bind(res);

  res.render = function (view, options, callback) {
    const span = trace.getActiveSpan();
    const traceId = span ? span.spanContext().traceId : '';

    // Inject traceId into template locals
    options = options || {};
    options.traceId = traceId;

    return originalRender(view, options, callback);
  };

  next();
}

// In your HTML template
// <meta name="trace-id" content="<%= traceId %>">
```

## Converting Browser Metrics to OpenTelemetry

On the server side, receive the browser metrics and convert them to OpenTelemetry metrics with the trace ID as a link:

```python
# browser_metrics_endpoint.py
from flask import Flask, request, jsonify
from opentelemetry import metrics, trace

meter = metrics.get_meter("browser-vitals")

# Create histograms for each vital
lcp_histogram = meter.create_histogram("browser.lcp", unit="ms", description="Largest Contentful Paint")
fid_histogram = meter.create_histogram("browser.fid", unit="ms", description="First Input Delay")
cls_histogram = meter.create_histogram("browser.cls", description="Cumulative Layout Shift")
ttfb_histogram = meter.create_histogram("browser.ttfb", unit="ms", description="Time to First Byte")
inp_histogram = meter.create_histogram("browser.inp", unit="ms", description="Interaction to Next Paint")

METRIC_MAP = {
    "LCP": lcp_histogram,
    "FID": fid_histogram,
    "CLS": cls_histogram,
    "TTFB": ttfb_histogram,
    "INP": inp_histogram,
}

app = Flask(__name__)

@app.route("/api/v1/browser-metrics", methods=["POST"])
def receive_browser_metric():
    data = request.get_json()
    metric_name = data.get("name")
    histogram = METRIC_MAP.get(metric_name)

    if histogram is None:
        return jsonify({"error": "unknown metric"}), 400

    attributes = {
        "page.url": data.get("page", "unknown"),
        "vital.rating": data.get("rating", "unknown"),
        "server.trace_id": data.get("serverTraceId", ""),
    }

    histogram.record(data["value"], attributes)
    return jsonify({"status": "ok"}), 200
```

## Building the Correlation Query

Now that both browser vitals and backend traces share a trace ID, you can query for correlations. Here is a PromQL example to compare LCP with backend TTFB:

```promql
# Average LCP grouped by page, only for "poor" rated pages
avg(browser_lcp{vital_rating="poor"}) by (page_url)

# Compare with the P95 backend response time for the same pages
histogram_quantile(0.95,
  sum(rate(http_server_duration_seconds_bucket{http_route=~"/products|/checkout|/"}[15m])) by (le, http_route)
)
```

## Analyzing the Correlation

When you plot these side by side, patterns emerge. Here is what each combination tells you:

- **High LCP, high TTFB, slow backend traces**: The backend is the bottleneck. Look at the trace spans to find the slow operation.
- **High LCP, low TTFB, fast backend traces**: The backend is fine, the problem is on the frontend. Large images, render-blocking scripts, or heavy JavaScript are likely culprits.
- **High FID/INP, any TTFB**: Input delay is almost always a frontend issue. Heavy main-thread work during page load or interaction is usually the cause.
- **High CLS, any backend metric**: Layout shifts are purely a frontend rendering issue. The backend is not involved.

## Creating Alerts Based on Combined Signals

Set up alerts that consider both sides:

```yaml
# alerting-rules.yaml
groups:
  - name: combined-performance
    rules:
      - alert: BackendCausedSlowLCP
        expr: |
          avg(browser_lcp{vital_rating="poor"}) by (page_url) > 2500
          and
          histogram_quantile(0.95, sum(rate(http_server_duration_seconds_bucket[5m])) by (le)) > 0.8
        for: 10m
        annotations:
          summary: "LCP is poor and backend response time is high"

      - alert: FrontendCausedSlowLCP
        expr: |
          avg(browser_lcp{vital_rating="poor"}) by (page_url) > 2500
          and
          histogram_quantile(0.95, sum(rate(http_server_duration_seconds_bucket[5m])) by (le)) < 0.3
        for: 10m
        annotations:
          summary: "LCP is poor but backend is fast - frontend optimization needed"
```

## Wrapping Up

Correlating Core Web Vitals with backend traces removes the guesswork from performance debugging. Instead of separately investigating frontend and backend, you can immediately see where the bottleneck sits. The trace ID is the bridge that connects user experience numbers to server-side operations, and OpenTelemetry makes it straightforward to build that bridge.
