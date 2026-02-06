# How to Define and Enforce Performance Budgets Using OpenTelemetry P50/P95/P99 Latency Histograms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Performance Budgets, Latency, Histograms, SLOs

Description: Learn how to define performance budgets using OpenTelemetry histogram data at P50, P95, and P99 percentiles and enforce them automatically.

Performance budgets are the guardrails that keep your application fast. Without them, latency creeps up slowly until one day someone notices the checkout page takes four seconds. By defining budgets around P50, P95, and P99 latency percentiles and enforcing them through OpenTelemetry data, you can prevent that from happening.

## Understanding Latency Percentiles

P50 represents the median experience. Half your users see latency below this number. P95 captures the experience of users in the long tail, and P99 represents the worst case that still affects 1 in 100 requests. Each percentile tells a different story, and you should set budgets for all three.

A typical budget for an API endpoint might look like this:
- P50: 50ms (the common case should be snappy)
- P95: 200ms (most users should never wait this long)
- P99: 500ms (even the worst cases stay under half a second)

## Recording Histograms with OpenTelemetry

OpenTelemetry histograms automatically bucket your latency values, making percentile computation straightforward. Here is how to set them up in Go:

```go
// metrics.go
package metrics

import (
    "context"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/metric"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/metric/metricdata"
)

var requestDuration metric.Float64Histogram

func InitMetrics() {
    meter := otel.Meter("myapp")

    var err error
    requestDuration, err = meter.Float64Histogram(
        "http.server.request.duration",
        metric.WithDescription("Server request duration in seconds"),
        metric.WithUnit("s"),
        // Define explicit bucket boundaries for fine-grained percentile calculation
        metric.WithExplicitBucketBoundaries(
            0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.15,
            0.2, 0.3, 0.5, 0.75, 1.0, 2.5, 5.0, 10.0,
        ),
    )
    if err != nil {
        panic(err)
    }
}

// RecordRequestDuration records the duration of an HTTP request
func RecordRequestDuration(ctx context.Context, route string, method string, statusCode int, duration time.Duration) {
    requestDuration.Record(ctx, duration.Seconds(),
        metric.WithAttributes(
            attribute.String("http.route", route),
            attribute.String("http.method", method),
            attribute.Int("http.status_code", statusCode),
        ),
    )
}
```

## Defining Performance Budgets as Code

Store your performance budgets in a configuration file that lives alongside your code:

```yaml
# performance-budgets.yaml
budgets:
  - endpoint: "/api/orders"
    method: "POST"
    p50_ms: 50
    p95_ms: 200
    p99_ms: 500

  - endpoint: "/api/products"
    method: "GET"
    p50_ms: 30
    p95_ms: 100
    p99_ms: 250

  - endpoint: "/api/users/profile"
    method: "GET"
    p50_ms: 20
    p95_ms: 80
    p99_ms: 150

  - endpoint: "/api/search"
    method: "GET"
    p50_ms: 100
    p95_ms: 400
    p99_ms: 800
```

## Enforcement Script

This script queries your metrics backend and checks each endpoint against its budget:

```python
# enforce_budgets.py
import yaml
import requests
import sys

PROMETHEUS_URL = "http://localhost:9090"

def load_budgets(path="performance-budgets.yaml"):
    with open(path) as f:
        return yaml.safe_load(f)["budgets"]

def query_latency_percentile(endpoint, method, percentile):
    """Query the histogram percentile for a specific route."""
    query = (
        f'histogram_quantile({percentile}, '
        f'sum(rate(http_server_request_duration_seconds_bucket{{'
        f'http_route="{endpoint}", http_method="{method}"'
        f'}}[10m])) by (le))'
    )
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query})
    results = resp.json().get("data", {}).get("result", [])
    if results:
        return float(results[0]["value"][1]) * 1000  # convert seconds to ms
    return None

def check_budgets():
    budgets = load_budgets()
    violations = []

    for budget in budgets:
        endpoint = budget["endpoint"]
        method = budget["method"]

        for percentile_key, quantile in [("p50_ms", 0.5), ("p95_ms", 0.95), ("p99_ms", 0.99)]:
            actual = query_latency_percentile(endpoint, method, quantile)
            limit = budget[percentile_key]

            if actual is None:
                print(f"  [SKIP] {method} {endpoint} - no data for {percentile_key}")
                continue

            label = percentile_key.replace("_ms", "").upper()
            if actual > limit:
                print(f"  [FAIL] {method} {endpoint} {label}: {actual:.1f}ms > {limit}ms budget")
                violations.append((endpoint, label, actual, limit))
            else:
                print(f"  [PASS] {method} {endpoint} {label}: {actual:.1f}ms <= {limit}ms budget")

    if violations:
        print(f"\n{len(violations)} budget violation(s) found!")
        return 1
    print("\nAll performance budgets met.")
    return 0

if __name__ == "__main__":
    sys.exit(check_budgets())
```

## Choosing the Right Bucket Boundaries

The accuracy of your percentile calculations depends on your histogram bucket boundaries. If your buckets are too coarse, the computed P99 might be significantly off from reality.

For latency-sensitive endpoints (under 100ms typical), use tight buckets: 1ms, 2ms, 5ms, 10ms, 25ms, 50ms, 75ms, 100ms, 150ms, 200ms.

For higher-latency operations like batch jobs, wider buckets make sense: 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s, 30s, 60s.

The OpenTelemetry default bucket boundaries work for general cases, but customizing them for your specific latency profile gives much better accuracy.

## Gradual Enforcement

When you first adopt performance budgets, you will likely find some endpoints already violating them. Do not try to fix everything at once. Start with budgets in warning mode (log violations but do not fail builds), then gradually tighten them and switch to enforcing mode as you optimize.

You can also set different strictness levels: enforce P50 and P95 budgets as hard failures, but treat P99 violations as warnings since tail latency is inherently noisy and harder to control.

## Wrapping Up

Performance budgets turn vague goals like "the app should be fast" into measurable, enforceable constraints. By grounding them in OpenTelemetry histogram data, you get precise percentile values that reflect real request latency. Define your budgets in code, enforce them in CI, and you will keep your application performing well over time.
