# How to Build a Synthetic Monitoring Pipeline with OpenTelemetry for API Uptime Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Synthetic Monitoring, API Uptime, SLA Tracking

Description: Build a complete synthetic monitoring pipeline using OpenTelemetry to track API uptime, response times, and SLA compliance across your services.

Real user monitoring tells you what happened. Synthetic monitoring tells you what will happen. By continuously probing your APIs from known locations with known requests, you establish a baseline of availability and performance that is independent of real traffic patterns. When uptime drops or latency spikes, you know about it before customers start filing support tickets.

This post walks through building a full synthetic monitoring pipeline using the OpenTelemetry Collector - from configuring probes to calculating SLA compliance.

## Architecture Overview

The pipeline has three stages:

1. **Probe Layer** - OpenTelemetry Collectors running HTTP checks against your API endpoints from multiple locations
2. **Processing Layer** - A central collector that aggregates probe results and enriches them with metadata
3. **Backend Layer** - Your observability platform where data is stored, visualized, and alerted on

All three stages use standard OpenTelemetry components and protocols.

## Configuring the Probe Collectors

Each probe location runs a lightweight collector that executes HTTP checks and forwards results:

```yaml
# probe-collector.yaml
# Deployed in each monitoring region. Runs HTTP checks against all API
# endpoints and forwards the results to the central aggregation collector.

receivers:
  httpcheck/api:
    targets:
      # Core API endpoints
      - endpoint: "https://api.example.com/v1/health"
        method: GET
      - endpoint: "https://api.example.com/v1/users/me"
        method: GET
        headers:
          Authorization: "Bearer ${env:SYNTHETIC_API_TOKEN}"
      - endpoint: "https://api.example.com/v1/products?limit=1"
        method: GET
        headers:
          Authorization: "Bearer ${env:SYNTHETIC_API_TOKEN}"

      # Authentication endpoints
      - endpoint: "https://auth.example.com/oauth/token"
        method: POST
        headers:
          Content-Type: "application/x-www-form-urlencoded"
        body: "grant_type=client_credentials&client_id=${env:CLIENT_ID}&client_secret=${env:CLIENT_SECRET}"

      # Webhook receiver
      - endpoint: "https://webhooks.example.com/health"
        method: GET

    collection_interval: 60s

processors:
  resource:
    attributes:
      - key: probe.location
        value: "${env:PROBE_LOCATION}"      # e.g., "us-east-1", "eu-west-1"
        action: upsert
      - key: probe.provider
        value: "${env:PROBE_PROVIDER}"      # e.g., "aws", "gcp"
        action: upsert
      - key: probe.collector_id
        value: "${env:HOSTNAME}"
        action: upsert

  batch:
    timeout: 15s

exporters:
  otlp:
    endpoint: "central-collector.monitoring.svc:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [httpcheck/api]
      processors: [resource, batch]
      exporters: [otlp]
```

Deploy this in at least three regions to get meaningful availability data. A single-location probe cannot distinguish between "the API is down" and "the network path from this probe is broken."

## Central Aggregation Collector

The central collector receives metrics from all probes, applies additional processing, and forwards to your backend:

```yaml
# central-collector.yaml
# Receives synthetic check results from all probe locations.
# Applies additional processing and enrichment before forwarding to backend.

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  # Add timestamps and test metadata
  resource:
    attributes:
      - key: monitoring.pipeline
        value: "synthetic"
        action: upsert
      - key: monitoring.version
        value: "2.1"
        action: upsert

  # Filter out noise - only keep failed checks and sampled successes
  filter/reduce:
    metrics:
      metric:
        - 'name == "httpcheck.duration" and value > 0'
        - 'name == "httpcheck.status"'
        - 'name == "httpcheck.error"'

  batch:
    timeout: 10s
    send_batch_size: 512

exporters:
  otlp/backend:
    endpoint: "backend.example.com:4317"
    sending_queue:
      enabled: true
      queue_size: 5000

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [resource, filter/reduce, batch]
      exporters: [otlp/backend]
```

## Calculating Uptime Percentages

With the data in your backend, you can calculate uptime as a percentage. Here is a PromQL query that computes availability over a 30-day window:

```
# Calculate uptime percentage per endpoint over the last 30 days.
# A check is "up" if the status code is between 200 and 399.

(
  sum_over_time(
    (httpcheck_status >= 200 and httpcheck_status < 400)[30d:1m]
  )
  /
  count_over_time(
    httpcheck_status[30d:1m]
  )
) * 100
```

For SLA reporting, you typically need per-endpoint and per-region breakdowns:

```
# Per-endpoint, per-region uptime over 30 days
(
  sum by (http_url, probe_location) (
    sum_over_time(
      (httpcheck_status >= 200 and httpcheck_status < 400)[30d:1m]
    )
  )
  /
  sum by (http_url, probe_location) (
    count_over_time(
      httpcheck_status[30d:1m]
    )
  )
) * 100
```

## Multi-Step API Checks

Single-endpoint checks are useful, but real API usage involves sequences of calls. You can simulate multi-step workflows by chaining checks with dependencies. Here is a Python script that runs as a custom receiver, performing a multi-step API check and pushing results as OTLP metrics:

```python
# multi_step_check.py
# Performs a multi-step API workflow check:
# 1. Authenticate and get a token
# 2. Create a resource
# 3. Read the resource back
# 4. Delete the resource
# Reports timing and success/failure for each step.

import requests
import time
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader

# Set up OTLP metric export
exporter = OTLPMetricExporter(endpoint="localhost:4317", insecure=True)
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=60000)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("synthetic.multistep")
step_duration = meter.create_histogram("synthetic.step.duration_ms", unit="ms")
step_status = meter.create_counter("synthetic.step.status")

API_BASE = "https://api.example.com/v1"

def run_check():
    # Step 1: Authenticate
    start = time.time()
    try:
        resp = requests.post(f"{API_BASE}/auth/token", json={
            "client_id": "synthetic-monitor",
            "client_secret": "secret-from-env"
        }, timeout=10)
        duration = (time.time() - start) * 1000
        step_duration.record(duration, {"step": "authenticate"})
        step_status.add(1, {"step": "authenticate", "result": "success" if resp.ok else "failure"})
        if not resp.ok:
            return
        token = resp.json()["access_token"]
    except Exception:
        step_status.add(1, {"step": "authenticate", "result": "error"})
        return

    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: Create a test resource
    start = time.time()
    try:
        resp = requests.post(f"{API_BASE}/test-resources", json={
            "name": "synthetic-check", "timestamp": int(time.time())
        }, headers=headers, timeout=10)
        duration = (time.time() - start) * 1000
        step_duration.record(duration, {"step": "create_resource"})
        step_status.add(1, {"step": "create_resource", "result": "success" if resp.ok else "failure"})
        if not resp.ok:
            return
        resource_id = resp.json()["id"]
    except Exception:
        step_status.add(1, {"step": "create_resource", "result": "error"})
        return

    # Step 3: Read back the resource
    start = time.time()
    try:
        resp = requests.get(f"{API_BASE}/test-resources/{resource_id}", headers=headers, timeout=10)
        duration = (time.time() - start) * 1000
        step_duration.record(duration, {"step": "read_resource"})
        step_status.add(1, {"step": "read_resource", "result": "success" if resp.ok else "failure"})
    except Exception:
        step_status.add(1, {"step": "read_resource", "result": "error"})

    # Step 4: Clean up
    start = time.time()
    try:
        resp = requests.delete(f"{API_BASE}/test-resources/{resource_id}", headers=headers, timeout=10)
        duration = (time.time() - start) * 1000
        step_duration.record(duration, {"step": "delete_resource"})
        step_status.add(1, {"step": "delete_resource", "result": "success" if resp.ok else "failure"})
    except Exception:
        step_status.add(1, {"step": "delete_resource", "result": "error"})

# Run the check every 5 minutes
while True:
    run_check()
    time.sleep(300)
```

## SLA Compliance Dashboard

Build a dashboard with these essential panels:

- **Current uptime** for each endpoint (big number, green/red)
- **Uptime trend** over 7 and 30 days
- **Response time percentiles** (p50, p95, p99) by endpoint and region
- **SLA budget remaining** - how many more minutes of downtime you can have this month
- **Multi-step check pass rate** - percentage of complete workflow successes

The SLA budget calculation is straightforward. For a 99.9% SLA over 30 days, you get 43.2 minutes of allowed downtime. Track consumed downtime and alert when 80% of the budget is used.

## Practical Tips

Rotate synthetic test credentials regularly and store them in a secrets manager, not in the collector config. Tag synthetic traffic with a recognizable header so your backend can exclude it from real user metrics. Run checks at intervals that match your SLA granularity - if your SLA measures in minutes, check at least every minute. And always have at least three probe locations, because two-out-of-three consensus is the minimum for distinguishing endpoint failure from probe failure.
