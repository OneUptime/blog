# How to Detect Latency Regression Between Deployments by Comparing OpenTelemetry Span Duration Histograms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Latency Regression, Span Duration, Histograms, Deployments

Description: Compare OpenTelemetry span duration histograms across deployments to detect latency regressions using statistical methods and PromQL.

Catching latency regressions after a deployment requires more than just comparing averages. An average can stay the same while the tail latency doubles. You need to compare the full shape of the latency distribution, and that is exactly what histogram comparison gives you. By comparing OpenTelemetry span duration histograms between deployments, you can detect regressions across the entire latency spectrum.

## Tagging Spans with Deployment Metadata

First, make sure your spans carry deployment information so you can compare different versions:

```javascript
// tracing-setup.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');
const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'api-service',
    [SEMRESATTRS_SERVICE_VERSION]: process.env.APP_VERSION || 'unknown',
    // Custom attributes for deployment tracking
    'deployment.id': process.env.DEPLOY_ID || 'unknown',
    'deployment.timestamp': process.env.DEPLOY_TIMESTAMP || new Date().toISOString(),
    'git.commit.sha': process.env.GIT_SHA || 'unknown',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4317',
  }),
});

sdk.start();
```

## Generating Span Metrics from Traces

Use the OpenTelemetry Collector's Span Metrics Connector to turn traces into histograms:

```yaml
# collector-config.yaml
connectors:
  spanmetrics:
    histogram:
      explicit:
        buckets: [2ms, 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2s, 5s]
    dimensions:
      - name: service.version
      - name: deployment.id
      - name: http.route

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [spanmetrics]
    metrics:
      receivers: [spanmetrics]
      exporters: [prometheus]
```

## Comparing Histograms with PromQL

Once you have deployment-tagged histograms in Prometheus, you can compare percentiles across versions:

```promql
# P95 latency for the current deployment
histogram_quantile(0.95,
  sum(rate(duration_milliseconds_bucket{service_version="2.1.0"}[10m])) by (le, http_route)
)

# P95 latency for the previous deployment
histogram_quantile(0.95,
  sum(rate(duration_milliseconds_bucket{service_version="2.0.9"}[10m])) by (le, http_route)
)

# Percentage change in P95 between deployments
(
  histogram_quantile(0.95, sum(rate(duration_milliseconds_bucket{service_version="2.1.0"}[10m])) by (le, http_route))
  -
  histogram_quantile(0.95, sum(rate(duration_milliseconds_bucket{service_version="2.0.9"}[10m])) by (le, http_route))
)
/
histogram_quantile(0.95, sum(rate(duration_milliseconds_bucket{service_version="2.0.9"}[10m])) by (le, http_route))
* 100
```

## Automated Comparison Script

For CI/CD integration, automate the comparison with a Python script:

```python
# compare_deployments.py
import requests
import sys
import os

PROMETHEUS_URL = os.environ.get("PROMETHEUS_URL", "http://localhost:9090")
CURRENT_VERSION = os.environ["CURRENT_VERSION"]
PREVIOUS_VERSION = os.environ["PREVIOUS_VERSION"]

# Define regression thresholds per percentile
THRESHOLDS = {
    0.5: 10,   # P50: allow up to 10% increase
    0.95: 15,  # P95: allow up to 15% increase
    0.99: 20,  # P99: allow up to 20% increase
}

def get_percentile(version, percentile):
    """Query histogram percentile for a specific deployment version."""
    query = (
        f'histogram_quantile({percentile}, '
        f'sum(rate(duration_milliseconds_bucket{{service_version="{version}"}}[10m])) '
        f'by (le, http_route))'
    )
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query})
    results = {}
    for r in resp.json().get("data", {}).get("result", []):
        route = r["metric"].get("http_route", "unknown")
        value = float(r["value"][1])
        results[route] = value
    return results

def compare():
    regressions = []

    for percentile, threshold in THRESHOLDS.items():
        label = f"P{int(percentile * 100)}"
        current = get_percentile(CURRENT_VERSION, percentile)
        previous = get_percentile(PREVIOUS_VERSION, percentile)

        for route, curr_val in current.items():
            prev_val = previous.get(route)
            if prev_val is None or prev_val == 0:
                continue

            change_pct = ((curr_val - prev_val) / prev_val) * 100

            if change_pct > threshold:
                regressions.append({
                    "route": route,
                    "percentile": label,
                    "previous_ms": round(prev_val, 2),
                    "current_ms": round(curr_val, 2),
                    "change_pct": round(change_pct, 1),
                })
                print(f"[REGRESSION] {route} {label}: {prev_val:.2f}ms -> {curr_val:.2f}ms (+{change_pct:.1f}%)")
            else:
                print(f"[OK] {route} {label}: {prev_val:.2f}ms -> {curr_val:.2f}ms ({change_pct:+.1f}%)")

    return regressions

if __name__ == "__main__":
    regressions = compare()
    if regressions:
        print(f"\nDetected {len(regressions)} regression(s)!")
        sys.exit(1)
    print("\nNo regressions detected.")
```

## Beyond Simple Percentile Comparison

Percentile comparison works well for most cases, but sometimes you need to compare the entire distribution shape. The Kolmogorov-Smirnov test can tell you if two latency distributions are statistically different:

```python
# distribution_comparison.py
from scipy import stats
import numpy as np

def compare_distributions(current_buckets, previous_buckets):
    """
    Compare two histogram distributions using the KS test.
    buckets is a dict of {boundary_ms: cumulative_count}
    """
    # Convert histogram buckets to approximate samples
    current_samples = histogram_to_samples(current_buckets)
    previous_samples = histogram_to_samples(previous_buckets)

    # Run the two-sample KS test
    statistic, p_value = stats.ks_2samp(current_samples, previous_samples)

    if p_value < 0.05:
        print(f"Distributions are significantly different (p={p_value:.4f}, KS={statistic:.4f})")
        return True
    else:
        print(f"Distributions are not significantly different (p={p_value:.4f})")
        return False

def histogram_to_samples(buckets):
    """Convert histogram bucket counts to approximate sample values."""
    samples = []
    sorted_bounds = sorted(buckets.keys())
    for i, bound in enumerate(sorted_bounds):
        count = buckets[bound]
        if i == 0:
            midpoint = bound / 2
        else:
            midpoint = (sorted_bounds[i - 1] + bound) / 2
        samples.extend([midpoint] * count)
    return np.array(samples)
```

## Practical Tips

Give the new deployment at least 10 to 15 minutes of traffic before comparing. Early traffic after a deploy often includes cold cache effects that skew the numbers.

Compare like with like. If you deploy during peak hours but your baseline was captured during off-peak, the comparison is meaningless. Use time-of-day-matched comparisons or normalize by request volume.

Track which routes have the highest regression frequency. If the same endpoint regresses repeatedly, it may need architectural attention rather than just performance fixes.

## Wrapping Up

Comparing span duration histograms across deployments is the most reliable way to catch latency regressions. Percentile comparison catches most issues, and statistical distribution tests can catch subtle changes. By automating this comparison in your deployment pipeline, you get early warning before users notice the difference.
