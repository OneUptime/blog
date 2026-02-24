# How to Monitor Telemetry Pipeline Health in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Monitoring, Observability, Kubernetes

Description: Practical techniques for monitoring the health of your Istio telemetry pipeline to catch data loss and performance issues before they affect observability.

---

There is an irony that most teams run into with Istio: they build an entire observability stack to monitor their services but forget to monitor the observability stack itself. Your dashboards and alerts are only as good as the data flowing into them. If the telemetry pipeline breaks or degrades silently, you lose visibility right when you need it most.

Monitoring the telemetry pipeline means watching every link in the chain: the Envoy sidecars generating data, the collection layer scraping it, the processing layer transforming it, and the storage layer persisting it. A failure anywhere in that chain creates a blind spot.

## Understanding the Telemetry Pipeline

In a typical Istio setup, the telemetry pipeline looks like this:

1. Envoy sidecar generates metrics, traces, and logs
2. Prometheus scrapes metrics from each sidecar
3. Trace data flows to a collector (Jaeger, Zipkin, or OpenTelemetry Collector)
4. Logs go to stdout and are collected by a log aggregator

Each of these steps can fail independently. Here is how to watch all of them.

## Monitoring Envoy Sidecar Health

The sidecars are the data source. If they are not healthy, nothing else matters. Envoy exposes its own health and performance metrics.

Check sidecar stats directly:

```bash
kubectl exec -n your-namespace deploy/your-app -c istio-proxy -- \
  curl -s localhost:15000/stats | grep -E "server\.(live|uptime|memory)"
```

Key Envoy metrics to track in Prometheus:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: envoy-sidecar-health
  namespace: monitoring
spec:
  groups:
    - name: envoy-health
      rules:
        - alert: EnvoySidecarHighMemory
          expr: |
            envoy_server_memory_allocated{} > 300 * 1024 * 1024
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Envoy sidecar memory above 300MB on {{ $labels.pod }}"
        - alert: EnvoySidecarNotReady
          expr: |
            envoy_server_live{} == 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Envoy sidecar not live on {{ $labels.pod }}"
```

## Monitoring Prometheus Scrape Health

Prometheus records metrics about its own scraping operations. These are gold for understanding if telemetry data is actually making it from sidecars to storage.

Check scrape target health:

```bash
curl -s http://prometheus:9090/api/v1/targets | \
  jq '.data.activeTargets[] | select(.health != "up") | .labels'
```

Set up alerts for scrape failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: scrape-health
  namespace: monitoring
spec:
  groups:
    - name: prometheus-scrape
      rules:
        - alert: HighScrapeFailureRate
          expr: |
            sum(up{job="kubernetes-pods"} == 0)
            /
            count(up{job="kubernetes-pods"})
            > 0.1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "More than 10% of scrape targets are down"
        - alert: ScrapeDurationHigh
          expr: |
            scrape_duration_seconds{job="kubernetes-pods"} > 10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Scrape taking more than 10 seconds for {{ $labels.instance }}"
        - alert: PrometheusTargetMissing
          expr: |
            up{} == 0
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Prometheus target {{ $labels.instance }} has been down for 10 minutes"
```

## Monitoring Prometheus Storage and Performance

Prometheus itself can become a bottleneck. Monitor its internal metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: prometheus-internal-health
  namespace: monitoring
spec:
  groups:
    - name: prometheus-health
      rules:
        - alert: PrometheusHighMemory
          expr: |
            process_resident_memory_bytes{job="prometheus"}
            > 12 * 1024 * 1024 * 1024
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Prometheus using more than 12GB RAM"
        - alert: PrometheusHighSampleIngestion
          expr: |
            rate(prometheus_tsdb_head_samples_appended_total[5m]) > 500000
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Prometheus ingesting more than 500k samples/sec"
        - alert: PrometheusTSDBCompactionsFailing
          expr: |
            increase(prometheus_tsdb_compactions_failed_total[1h]) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Prometheus TSDB compactions are failing"
        - alert: PrometheusRuleEvaluationFailures
          expr: |
            increase(prometheus_rule_evaluation_failures_total[5m]) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Prometheus rule evaluations are failing"
```

## Monitoring Trace Collection Pipeline

If you are using the OpenTelemetry Collector for traces, it exposes its own metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: otel-collector-health
  namespace: monitoring
spec:
  groups:
    - name: otel-collector
      rules:
        - alert: OtelCollectorDroppingSpans
          expr: |
            rate(otelcol_processor_dropped_spans[5m]) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "OTel Collector is dropping trace spans"
        - alert: OtelCollectorExportFailures
          expr: |
            rate(otelcol_exporter_send_failed_spans[5m]) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "OTel Collector failing to export spans"
        - alert: OtelCollectorQueueFull
          expr: |
            otelcol_exporter_queue_size / otelcol_exporter_queue_capacity > 0.8
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "OTel Collector export queue above 80%"
```

For Jaeger specifically, check the collector health:

```bash
kubectl exec -n observability deploy/jaeger-collector -- \
  curl -s localhost:14269/metrics | grep -E "jaeger_collector_(spans|queue)"
```

## Building a Telemetry Health Dashboard

Create a Grafana dashboard that shows the entire pipeline at a glance. Here are the key panels to include:

```bash
# Query: Active scrape targets
count(up{job="kubernetes-pods"})

# Query: Unhealthy scrape targets
count(up{job="kubernetes-pods"} == 0)

# Query: Metric ingestion rate
rate(prometheus_tsdb_head_samples_appended_total[5m])

# Query: Prometheus memory usage
process_resident_memory_bytes{job="prometheus"}

# Query: Active time series
prometheus_tsdb_head_series

# Query: Trace spans received per second
rate(otelcol_receiver_accepted_spans[5m])

# Query: Trace spans dropped per second
rate(otelcol_processor_dropped_spans[5m])

# Query: Average scrape duration
avg(scrape_duration_seconds{job="kubernetes-pods"})
```

## Implementing Synthetic Monitoring

Create a canary service that generates known telemetry and then verify it arrives:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: telemetry-canary
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: telemetry-canary
  template:
    metadata:
      labels:
        app: telemetry-canary
        sidecar.istio.io/inject: "true"
    spec:
      containers:
        - name: canary
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              while true; do
                curl -s http://httpbin.istio-system:8000/status/200 > /dev/null
                curl -s http://httpbin.istio-system:8000/status/500 > /dev/null
                sleep 30
              done
```

Then set up an alert that fires if the canary metrics disappear:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: telemetry-canary-alert
  namespace: monitoring
spec:
  groups:
    - name: canary
      rules:
        - alert: TelemetryCanaryMissing
          expr: |
            absent(
              rate(istio_requests_total{
                source_workload="telemetry-canary"
              }[5m])
            )
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Telemetry canary metrics are missing - pipeline may be broken"
```

## Quick Health Check Script

For manual checks or CI pipelines, use this script:

```bash
#!/bin/bash

echo "=== Telemetry Pipeline Health Check ==="

# Check Prometheus is up
PROM_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://prometheus:9090/-/healthy)
echo "Prometheus health: $PROM_STATUS"

# Check scrape targets
TARGETS_DOWN=$(curl -s http://prometheus:9090/api/v1/targets | \
  jq '[.data.activeTargets[] | select(.health != "up")] | length')
echo "Scrape targets down: $TARGETS_DOWN"

# Check active series count
SERIES=$(curl -s http://prometheus:9090/api/v1/query?query=prometheus_tsdb_head_series | \
  jq '.data.result[0].value[1]')
echo "Active time series: $SERIES"

# Check sample ingestion rate
INGESTION=$(curl -s "http://prometheus:9090/api/v1/query?query=rate(prometheus_tsdb_head_samples_appended_total[5m])" | \
  jq '.data.result[0].value[1]')
echo "Sample ingestion rate: $INGESTION/s"
```

## Key Takeaways

Your telemetry pipeline is itself a distributed system, and it deserves the same monitoring attention you give your application services. The canary approach is especially valuable because it gives you end-to-end validation that data is flowing from proxies all the way through to storage. Do not wait for an incident to discover your observability stack was broken the whole time.
