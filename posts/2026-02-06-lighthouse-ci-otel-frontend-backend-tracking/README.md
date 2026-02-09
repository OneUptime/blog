# How to Integrate Lighthouse CI Scores with OpenTelemetry for Combined Frontend-Backend Performance Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Lighthouse CI, Frontend Performance, Backend Performance, Web Vitals

Description: Combine Lighthouse CI scores with OpenTelemetry backend traces for a unified view of frontend and backend performance in one place.

Frontend performance and backend performance are often tracked in completely separate systems. The frontend team watches Lighthouse scores and Core Web Vitals while the backend team monitors trace latencies and throughput. But users experience both together. When a page loads slowly, the cause could be a slow API response, heavy JavaScript, or both.

By feeding Lighthouse CI results into OpenTelemetry alongside your backend traces, you get a single source of truth for end-to-end performance.

## Setting Up Lighthouse CI

First, configure Lighthouse CI to run in your pipeline. Install it and create a configuration:

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/products',
        'http://localhost:3000/checkout',
      ],
      numberOfRuns: 3, // run each page 3 times for consistency
      settings: {
        chromeFlags: '--no-sandbox --headless',
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-results',
    },
  },
};
```

## Converting Lighthouse Results to OpenTelemetry Metrics

After Lighthouse CI runs, parse the results and push them as OpenTelemetry metrics:

```python
# lighthouse_to_otel.py
import json
import glob
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Set up OTel metrics
exporter = OTLPMetricExporter(endpoint="http://localhost:4317", insecure=True)
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=5000)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("lighthouse-ci")

# Create gauges for Lighthouse scores
performance_score = meter.create_gauge("lighthouse.score.performance")
fcp_gauge = meter.create_gauge("lighthouse.fcp.milliseconds")
lcp_gauge = meter.create_gauge("lighthouse.lcp.milliseconds")
tbt_gauge = meter.create_gauge("lighthouse.tbt.milliseconds")
cls_gauge = meter.create_gauge("lighthouse.cls.score")

def parse_and_emit(results_dir="./lighthouse-results"):
    """Parse Lighthouse JSON results and emit as OTel metrics."""
    for result_file in glob.glob(f"{results_dir}/*.json"):
        with open(result_file) as f:
            report = json.load(f)

        url = report.get("finalUrl", "unknown")
        categories = report.get("categories", {})
        audits = report.get("audits", {})

        # Emit the overall performance score (0-100)
        perf_score = categories.get("performance", {}).get("score", 0) * 100
        performance_score.set(perf_score, {"url": url, "source": "lighthouse-ci"})

        # Emit individual metric values
        if "first-contentful-paint" in audits:
            fcp_val = audits["first-contentful-paint"]["numericValue"]
            fcp_gauge.set(fcp_val, {"url": url})

        if "largest-contentful-paint" in audits:
            lcp_val = audits["largest-contentful-paint"]["numericValue"]
            lcp_gauge.set(lcp_val, {"url": url})

        if "total-blocking-time" in audits:
            tbt_val = audits["total-blocking-time"]["numericValue"]
            tbt_gauge.set(tbt_val, {"url": url})

        if "cumulative-layout-shift" in audits:
            cls_val = audits["cumulative-layout-shift"]["numericValue"]
            cls_gauge.set(cls_val, {"url": url})

        print(f"Emitted metrics for {url}: score={perf_score}, LCP={audits.get('largest-contentful-paint', {}).get('numericValue', 'N/A')}ms")

    provider.force_flush()

if __name__ == "__main__":
    parse_and_emit()
```

## Linking Frontend Metrics with Backend Traces

The real power comes from correlating frontend metrics with backend trace data. Add a custom span attribute to your backend traces that identifies which page was being loaded:

```javascript
// backend-middleware.js
const { trace } = require('@opentelemetry/api');

function pageTrackingMiddleware(req, res, next) {
  const span = trace.getActiveSpan();
  if (span) {
    // Extract the referring page from the request headers
    const referer = req.headers['referer'] || req.headers['x-page-url'] || '';
    const pagePath = new URL(referer, 'http://localhost').pathname;

    span.setAttribute('page.url', pagePath);
    span.setAttribute('request.source', 'browser');
  }
  next();
}

module.exports = { pageTrackingMiddleware };
```

## Building a Combined Dashboard

With both Lighthouse metrics and backend traces flowing into the same observability platform, you can build dashboards that show the full picture. In Grafana, create a dashboard with these panels:

```
Panel 1: Lighthouse Performance Scores by Page
  Query: lighthouse_score_performance{url=~".*"}

Panel 2: Backend API Latency (P95) by Page
  Query: histogram_quantile(0.95, sum(rate(http_server_duration_bucket{page_url=~".*"}[5m])) by (le, page_url))

Panel 3: LCP vs Backend Response Time Correlation
  Query A: lighthouse_lcp_milliseconds
  Query B: histogram_quantile(0.95, sum(rate(http_server_duration_bucket[5m])) by (le))
```

## Automating the Full Pipeline

Put it all together in CI:

```yaml
# .github/workflows/full-perf-check.yml
steps:
  - name: Start application
    run: docker-compose up -d

  - name: Run Lighthouse CI
    run: npx lhci autorun

  - name: Push Lighthouse metrics to OTel
    run: python lighthouse_to_otel.py

  - name: Run backend performance tests
    run: npm run perf-test

  - name: Check combined performance budgets
    run: python check_combined_budgets.py
```

## Why This Matters

When your Lighthouse score drops, the natural question is "why?" If you can see that the backend API latency increased at the same time, you have your answer. Conversely, if backend latency is stable but Lighthouse scores dropped, you know the problem is on the frontend side.

This combined view eliminates the finger-pointing between frontend and backend teams and helps everyone focus on the actual bottleneck.

## Wrapping Up

Integrating Lighthouse CI with OpenTelemetry bridges the gap between frontend and backend performance monitoring. You get a unified picture of how your application performs from the user's perspective, with the ability to drill down into exactly where slowdowns originate. The setup takes some initial effort, but it fundamentally changes how you think about and debug performance issues.
