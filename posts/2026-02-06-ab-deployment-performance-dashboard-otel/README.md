# How to Build a Performance Comparison Dashboard for A/B Deployments Using OpenTelemetry Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, A/B Deployments, Performance Dashboard, Canary Releases, Grafana

Description: Build a Grafana dashboard that compares performance metrics side-by-side for A/B deployments using OpenTelemetry data from both versions.

When you run A/B deployments or canary releases, you need a clear, real-time comparison of how the new version performs against the old one. Averages and logs are not enough. You want side-by-side histograms, error rate comparisons, and throughput charts that update live as traffic flows through both versions. OpenTelemetry makes this possible by tagging all telemetry with the deployment version.

## Tagging Telemetry with Deployment Version

Every metric and trace from your application needs to carry the deployment version. Set this up in your OpenTelemetry resource configuration:

```go
// main.go
package main

import (
    "context"
    "os"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    "go.opentelemetry.io/otel/metric"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func initMetrics() (*sdkmetric.MeterProvider, error) {
    ctx := context.Background()

    // Every metric will carry these resource attributes
    res, _ := resource.Merge(
        resource.Default(),
        resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName("checkout-service"),
            semconv.ServiceVersion(os.Getenv("APP_VERSION")),
            // Custom deployment attributes for A/B comparison
            attribute.String("deployment.variant", os.Getenv("DEPLOY_VARIANT")), // "canary" or "stable"
            attribute.String("deployment.id", os.Getenv("DEPLOY_ID")),
            attribute.String("k8s.pod.name", os.Getenv("HOSTNAME")),
        ),
    )

    exporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint("otel-collector:4317"),
        otlpmetricgrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    mp := sdkmetric.NewMeterProvider(
        sdkmetric.WithResource(res),
        sdkmetric.WithReader(sdkmetric.NewPeriodicReader(exporter)),
    )
    otel.SetMeterProvider(mp)
    return mp, nil
}
```

## Recording Key Comparison Metrics

Instrument the metrics that matter most for comparing deployment performance:

```go
// metrics.go
package main

import (
    "context"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
)

var (
    meter          = otel.Meter("checkout-service")
    requestLatency metric.Float64Histogram
    requestCounter metric.Int64Counter
    errorCounter   metric.Int64Counter
    activeRequests metric.Int64UpDownCounter
)

func initInstruments() {
    requestLatency, _ = meter.Float64Histogram("http.request.duration",
        metric.WithUnit("s"),
        metric.WithDescription("Request duration in seconds"),
    )
    requestCounter, _ = meter.Int64Counter("http.requests.total",
        metric.WithDescription("Total requests"),
    )
    errorCounter, _ = meter.Int64Counter("http.errors.total",
        metric.WithDescription("Total error responses"),
    )
    activeRequests, _ = meter.Int64UpDownCounter("http.active_requests",
        metric.WithDescription("Currently active requests"),
    )
}

func recordRequest(ctx context.Context, route string, statusCode int, duration time.Duration) {
    attrs := []attribute.KeyValue{
        attribute.String("http.route", route),
        attribute.Int("http.status_code", statusCode),
    }

    requestLatency.Record(ctx, duration.Seconds(), metric.WithAttributes(attrs...))
    requestCounter.Add(ctx, 1, metric.WithAttributes(attrs...))

    if statusCode >= 500 {
        errorCounter.Add(ctx, 1, metric.WithAttributes(attrs...))
    }
}
```

## Grafana Dashboard Configuration

Build a Grafana dashboard with side-by-side comparison panels. Here is the JSON model for the key panels:

```json
{
  "panels": [
    {
      "title": "P95 Latency - Stable vs Canary",
      "type": "timeseries",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{deployment_variant=\"stable\"}[5m])) by (le))",
          "legendFormat": "Stable P95"
        },
        {
          "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{deployment_variant=\"canary\"}[5m])) by (le))",
          "legendFormat": "Canary P95"
        }
      ]
    },
    {
      "title": "Error Rate Comparison",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum(rate(http_errors_total{deployment_variant=\"stable\"}[5m])) / sum(rate(http_requests_total{deployment_variant=\"stable\"}[5m]))",
          "legendFormat": "Stable Error Rate"
        },
        {
          "expr": "sum(rate(http_errors_total{deployment_variant=\"canary\"}[5m])) / sum(rate(http_requests_total{deployment_variant=\"canary\"}[5m]))",
          "legendFormat": "Canary Error Rate"
        }
      ]
    },
    {
      "title": "Throughput Comparison (req/s)",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum(rate(http_requests_total{deployment_variant=\"stable\"}[5m]))",
          "legendFormat": "Stable RPS"
        },
        {
          "expr": "sum(rate(http_requests_total{deployment_variant=\"canary\"}[5m]))",
          "legendFormat": "Canary RPS"
        }
      ]
    }
  ]
}
```

## Automated Canary Analysis

Beyond visual dashboards, automate the comparison with a script that decides whether the canary should be promoted:

```python
# canary_analysis.py
import requests
import sys

PROMETHEUS_URL = "http://prometheus:9090"

def query_prom(expr):
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": expr})
    results = resp.json().get("data", {}).get("result", [])
    if results:
        return float(results[0]["value"][1])
    return None

def analyze_canary():
    checks = []

    # Check 1: P95 latency comparison
    stable_p95 = query_prom(
        'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{deployment_variant="stable"}[10m])) by (le))'
    )
    canary_p95 = query_prom(
        'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{deployment_variant="canary"}[10m])) by (le))'
    )

    if stable_p95 and canary_p95:
        latency_ratio = canary_p95 / stable_p95
        passed = latency_ratio < 1.15  # canary should not be more than 15% slower
        checks.append(("P95 Latency", passed, f"ratio={latency_ratio:.2f}"))

    # Check 2: Error rate comparison
    stable_err = query_prom(
        'sum(rate(http_errors_total{deployment_variant="stable"}[10m])) / sum(rate(http_requests_total{deployment_variant="stable"}[10m]))'
    )
    canary_err = query_prom(
        'sum(rate(http_errors_total{deployment_variant="canary"}[10m])) / sum(rate(http_requests_total{deployment_variant="canary"}[10m]))'
    )

    if stable_err is not None and canary_err is not None:
        err_diff = canary_err - stable_err
        passed = err_diff < 0.01  # canary error rate should not be more than 1% higher
        checks.append(("Error Rate", passed, f"diff={err_diff:.4f}"))

    # Report results
    all_passed = True
    for name, passed, detail in checks:
        status = "PASS" if passed else "FAIL"
        print(f"[{status}] {name}: {detail}")
        if not passed:
            all_passed = False

    return all_passed

if __name__ == "__main__":
    if analyze_canary():
        print("\nCanary analysis PASSED - safe to promote")
        sys.exit(0)
    else:
        print("\nCanary analysis FAILED - do not promote")
        sys.exit(1)
```

## Dashboard Variables for Flexibility

Use Grafana template variables to make the dashboard flexible:

```
Variable: variant_a
  Type: Query
  Query: label_values(http_request_duration_seconds_bucket, deployment_variant)
  Default: stable

Variable: variant_b
  Type: Query
  Query: label_values(http_request_duration_seconds_bucket, deployment_variant)
  Default: canary

Variable: route
  Type: Query
  Query: label_values(http_request_duration_seconds_bucket, http_route)
  Multi-select: true
```

This lets operators compare any two deployment variants and filter by specific routes without editing the dashboard.

## Wrapping Up

A well-built A/B deployment comparison dashboard turns canary releases from a gut-feeling exercise into a data-driven decision. By tagging all OpenTelemetry metrics with deployment variant information and building side-by-side comparison views, you can see exactly how the new version compares to the old one across latency, errors, and throughput. Automated analysis scripts take it further by making promotion decisions based on quantitative thresholds rather than manual observation.
