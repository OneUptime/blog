# How to Implement Canary Testing with OpenTelemetry Metrics Comparison Between Old and New Versions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Canary Testing, Metrics Comparison, Deployment, SRE

Description: Use OpenTelemetry metrics to compare canary and baseline deployments side by side and automate promotion or rollback decisions.

Canary deployments send a small percentage of traffic to a new version while the old version handles the rest. The hard part is deciding whether the canary is healthy enough to promote. OpenTelemetry metrics give you a structured way to compare both versions using the same instrumentation, same metric names, and same attribute schema. The only difference is a version label.

## Labeling Canary vs Baseline Traffic

The foundation of canary analysis is a label that distinguishes which version handled each request. Set this as a resource attribute in your OpenTelemetry configuration:

```yaml
# For the baseline deployment
env:
  - name: OTEL_RESOURCE_ATTRIBUTES
    value: "service.name=checkout,service.version=1.4.2,deployment.type=baseline"

# For the canary deployment
env:
  - name: OTEL_RESOURCE_ATTRIBUTES
    value: "service.name=checkout,service.version=1.5.0,deployment.type=canary"
```

Both versions emit the same metrics with the same names. The `deployment.type` and `service.version` attributes let you slice the data.

## Instrumenting Key Metrics

Make sure both versions emit the metrics you care about for canary analysis. At minimum, track request latency, error rate, and throughput:

```python
# metrics.py - Shared instrumentation code
from opentelemetry import metrics

meter = metrics.get_meter("checkout-service")

# Request duration histogram
request_duration = meter.create_histogram(
    name="http.server.request.duration",
    description="Duration of HTTP requests",
    unit="ms",
)

# Error counter
error_counter = meter.create_counter(
    name="http.server.errors",
    description="Number of HTTP errors",
)

# Request counter
request_counter = meter.create_counter(
    name="http.server.requests",
    description="Total HTTP requests",
)

def record_request(method, route, status_code, duration_ms):
    """Record metrics for a single request."""
    attributes = {
        "http.method": method,
        "http.route": route,
        "http.status_code": status_code,
    }

    request_counter.add(1, attributes)
    request_duration.record(duration_ms, attributes)

    if status_code >= 500:
        error_counter.add(1, attributes)
```

## Setting Up the Collector for Side-by-Side Comparison

Configure the OpenTelemetry Collector to process metrics from both versions and export them to Prometheus:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  prometheus:
    endpoint: 0.0.0.0:8889
    resource_to_telemetry_conversion:
      enabled: true  # This converts resource attributes to metric labels

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

The `resource_to_telemetry_conversion` setting is critical. It converts `deployment.type` and `service.version` from resource attributes into metric labels, so you can filter by them in Prometheus.

## Writing the Canary Analysis Queries

With both versions reporting metrics, write PromQL queries that compare them:

```promql
# Error rate comparison
# Canary error rate
sum(rate(http_server_errors_total{deployment_type="canary"}[5m]))
/
sum(rate(http_server_requests_total{deployment_type="canary"}[5m]))

# Baseline error rate
sum(rate(http_server_errors_total{deployment_type="baseline"}[5m]))
/
sum(rate(http_server_requests_total{deployment_type="baseline"}[5m]))

# P99 latency comparison
histogram_quantile(0.99,
  sum(rate(http_server_request_duration_bucket{deployment_type="canary"}[5m])) by (le)
)
/
histogram_quantile(0.99,
  sum(rate(http_server_request_duration_bucket{deployment_type="baseline"}[5m])) by (le)
)
```

## Automating the Promotion Decision

Write a script that queries Prometheus and decides whether to promote or rollback:

```python
# canary_analysis.py
import requests
import sys
import time

PROMETHEUS_URL = "http://localhost:9090"
ANALYSIS_WINDOW = "10m"
ERROR_RATE_THRESHOLD = 1.1   # Canary error rate must be < 110% of baseline
LATENCY_THRESHOLD = 1.15     # Canary p99 must be < 115% of baseline

def query_prometheus(query):
    """Execute a PromQL query and return the scalar result."""
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query})
    result = resp.json()["data"]["result"]
    if not result:
        return None
    return float(result[0]["value"][1])

def get_error_rate(deployment_type):
    query = f'''
    sum(rate(http_server_errors_total{{deployment_type="{deployment_type}"}}[{ANALYSIS_WINDOW}]))
    /
    sum(rate(http_server_requests_total{{deployment_type="{deployment_type}"}}[{ANALYSIS_WINDOW}]))
    '''
    return query_prometheus(query)

def get_p99_latency(deployment_type):
    query = f'''
    histogram_quantile(0.99,
      sum(rate(http_server_request_duration_bucket{{deployment_type="{deployment_type}"}}[{ANALYSIS_WINDOW}])) by (le)
    )
    '''
    return query_prometheus(query)

def analyze_canary():
    """Compare canary metrics against baseline and decide."""
    baseline_errors = get_error_rate("baseline")
    canary_errors = get_error_rate("canary")
    baseline_p99 = get_p99_latency("baseline")
    canary_p99 = get_p99_latency("canary")

    print(f"Error rates - Baseline: {baseline_errors:.4f}, Canary: {canary_errors:.4f}")
    print(f"P99 latency - Baseline: {baseline_p99:.1f}ms, Canary: {canary_p99:.1f}ms")

    # Check error rate
    if baseline_errors and baseline_errors > 0:
        error_ratio = canary_errors / baseline_errors
        print(f"Error rate ratio: {error_ratio:.2f}x")
        if error_ratio > ERROR_RATE_THRESHOLD:
            print("FAIL: Canary error rate too high. Rolling back.")
            return "rollback"

    # Check latency
    if baseline_p99 and baseline_p99 > 0:
        latency_ratio = canary_p99 / baseline_p99
        print(f"Latency ratio: {latency_ratio:.2f}x")
        if latency_ratio > LATENCY_THRESHOLD:
            print("FAIL: Canary latency too high. Rolling back.")
            return "rollback"

    print("PASS: Canary metrics within acceptable range. Promoting.")
    return "promote"

if __name__ == "__main__":
    decision = analyze_canary()
    sys.exit(0 if decision == "promote" else 1)
```

## Integrating with Kubernetes

Trigger the analysis from your deployment pipeline:

```bash
#!/bin/bash
# canary-deploy.sh

# Deploy the canary
kubectl set image deployment/checkout checkout=checkout:1.5.0 --record
kubectl scale deployment/checkout-canary --replicas=1

# Wait for metrics to accumulate
echo "Waiting 10 minutes for canary metrics..."
sleep 600

# Run the analysis
if python3 canary_analysis.py; then
  echo "Promoting canary to full deployment"
  kubectl set image deployment/checkout checkout=checkout:1.5.0
  kubectl scale deployment/checkout-canary --replicas=0
else
  echo "Rolling back canary"
  kubectl scale deployment/checkout-canary --replicas=0
fi
```

Using OpenTelemetry metrics for canary analysis has a big advantage over custom monitoring: both versions use identical instrumentation code. You are comparing apples to apples. The only variable is the code change itself, not differences in how metrics are collected.
