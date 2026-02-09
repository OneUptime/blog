# How to Use OpenTelemetry Metrics for Automated Performance Regression Detection in CI/CD Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Performance Testing, CI/CD, Metrics, Regression Detection

Description: Learn how to integrate OpenTelemetry metrics into your CI/CD pipeline to automatically detect performance regressions before they reach production.

Performance regressions are sneaky. They slip into codebases through seemingly innocent changes and go unnoticed until users start complaining. The best way to catch them is to automate detection right in your CI/CD pipeline using OpenTelemetry metrics.

In this post, we will walk through setting up automated performance regression detection that runs on every pull request and deployment.

## The Core Idea

The approach is straightforward: run a consistent set of performance tests, emit metrics through OpenTelemetry, compare them against known baselines, and fail the build if thresholds are breached.

## Setting Up the OpenTelemetry Metrics Exporter

First, configure your application to emit performance metrics via OpenTelemetry. Here is a Node.js example:

```javascript
// perf-metrics-setup.js
const { MeterProvider, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');

// Create an OTLP exporter pointing to your collector
const exporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics',
});

const meterProvider = new MeterProvider({
  readers: [
    new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: 5000, // export every 5 seconds during test runs
    }),
  ],
});

const meter = meterProvider.getMeter('perf-regression-tests');

// Create histograms for tracking key performance indicators
const requestLatency = meter.createHistogram('http.request.duration', {
  description: 'HTTP request latency in milliseconds',
  unit: 'ms',
});

const throughputCounter = meter.createCounter('http.requests.total', {
  description: 'Total number of HTTP requests processed',
});

module.exports = { meter, requestLatency, throughputCounter, meterProvider };
```

## Writing Performance Test Wrappers

Wrap your existing test suite to record metrics automatically:

```javascript
// perf-test-runner.js
const { requestLatency, throughputCounter, meterProvider } = require('./perf-metrics-setup');

async function measureEndpoint(name, requestFn) {
  const startTime = Date.now();

  try {
    await requestFn();
    const duration = Date.now() - startTime;

    // Record the latency with the endpoint name as an attribute
    requestLatency.record(duration, {
      'http.route': name,
      'deployment.environment': process.env.CI_ENVIRONMENT || 'ci',
      'git.commit.sha': process.env.GIT_COMMIT_SHA || 'unknown',
    });

    throughputCounter.add(1, { 'http.route': name, 'http.status_code': 200 });

    return duration;
  } catch (err) {
    throughputCounter.add(1, { 'http.route': name, 'http.status_code': 500 });
    throw err;
  }
}

// Run a batch of tests and flush metrics
async function runPerfSuite(tests) {
  const results = {};
  for (const [name, fn] of Object.entries(tests)) {
    const durations = [];
    // Run each test 10 times for statistical significance
    for (let i = 0; i < 10; i++) {
      const d = await measureEndpoint(name, fn);
      durations.push(d);
    }
    results[name] = durations;
  }

  // Force flush all pending metrics before CI job finishes
  await meterProvider.forceFlush();
  return results;
}

module.exports = { measureEndpoint, runPerfSuite };
```

## The CI/CD Comparison Script

This script queries your metrics backend and compares against baselines:

```python
# compare_perf_metrics.py
import requests
import sys
import os

PROMETHEUS_URL = os.environ.get("PROMETHEUS_URL", "http://localhost:9090")
COMMIT_SHA = os.environ.get("GIT_COMMIT_SHA", "unknown")
BASELINE_BRANCH = os.environ.get("BASELINE_BRANCH", "main")

# Thresholds: if current P95 exceeds baseline P95 by this percentage, fail
REGRESSION_THRESHOLD_PERCENT = 15

def get_p95_latency(commit_sha):
    """Fetch the P95 latency for a given commit from Prometheus."""
    query = f'histogram_quantile(0.95, sum(rate(http_request_duration_bucket{{git_commit_sha="{commit_sha}"}}[5m])) by (le, http_route))'
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query})
    data = resp.json()
    results = {}
    for result in data.get("data", {}).get("result", []):
        route = result["metric"].get("http_route", "unknown")
        value = float(result["value"][1])
        results[route] = value
    return results

def main():
    current = get_p95_latency(COMMIT_SHA)
    baseline = get_p95_latency(BASELINE_BRANCH)

    regressions = []
    for route, current_p95 in current.items():
        baseline_p95 = baseline.get(route)
        if baseline_p95 is None:
            print(f"[NEW] {route}: {current_p95:.2f}ms (no baseline)")
            continue

        change_pct = ((current_p95 - baseline_p95) / baseline_p95) * 100
        status = "PASS" if change_pct < REGRESSION_THRESHOLD_PERCENT else "FAIL"

        if status == "FAIL":
            regressions.append((route, baseline_p95, current_p95, change_pct))

        print(f"[{status}] {route}: {baseline_p95:.2f}ms -> {current_p95:.2f}ms ({change_pct:+.1f}%)")

    if regressions:
        print(f"\nFound {len(regressions)} performance regression(s)!")
        sys.exit(1)

    print("\nAll performance checks passed.")
    sys.exit(0)

if __name__ == "__main__":
    main()
```

## Integrating into GitHub Actions

Add this step to your workflow:

```yaml
# .github/workflows/perf-check.yml
perf-regression-check:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Start OpenTelemetry Collector
      run: docker-compose up -d otel-collector prometheus

    - name: Run performance tests
      env:
        GIT_COMMIT_SHA: ${{ github.sha }}
        OTEL_EXPORTER_OTLP_ENDPOINT: http://localhost:4318/v1/metrics
      run: npm run perf-test

    - name: Compare against baseline
      env:
        PROMETHEUS_URL: http://localhost:9090
        GIT_COMMIT_SHA: ${{ github.sha }}
      run: python compare_perf_metrics.py
```

## Tips for Reliable Regression Detection

When running performance tests in CI, consistency matters more than raw numbers. Use the same instance types, warm up your application before measuring, and always run multiple iterations to smooth out noise.

Store your baselines in a persistent metrics store rather than in flat files. This lets you track trends over time and adjust thresholds dynamically based on historical variance.

Set your regression threshold carefully. Too tight (say 5%) and you will get false positives from normal variance. Too loose (say 50%) and real regressions slip through. Starting at 15% for P95 and 20% for P99 is a reasonable default for most web services.

## Wrapping Up

Automated performance regression detection saves you from shipping slow code. By combining OpenTelemetry metrics with a simple comparison script in your CI pipeline, you get early warnings about performance changes before they affect real users. The setup is not complicated, and the payoff in terms of caught regressions is well worth the effort.
