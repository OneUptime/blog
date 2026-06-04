# How to Use Jaeger Service Performance Monitoring to Detect K8s Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jaeger, Distributed Tracing, Performance Monitoring, Latency

Description: Learn how to use Jaeger's Service Performance Monitoring features to detect latency regressions and performance degradation in Kubernetes microservices through automated trace analysis and alerting.

---

Jaeger Service Performance Monitoring (SPM) analyzes trace data by computing aggregate metrics from trace spans. Instead of manually examining individual traces, you can use those SPM metrics with Prometheus alerts to identify when service latency exceeds baseline thresholds. This automated approach catches performance degradation early in Kubernetes deployments.

SPM calculates Request Rate, Error Rate, and Duration (RED metrics) from trace data. By monitoring these metrics over time, you detect when deployments introduce latency regressions. Jaeger SPM integrates with Prometheus, enabling alerts when service performance degrades beyond acceptable levels.

## Understanding Jaeger SPM Architecture

Jaeger SPM processes traces to extract performance metrics. The spanmetrics connector component reads trace spans and generates Prometheus metrics. These metrics track request rates, error rates, and latency percentiles for each service and span name.

The metrics capture dimensions including service name, span name, span kind, and status code. This granularity lets you identify exactly which operations regress during deployments. Time-series data enables comparison between deployment versions to detect performance changes.

## Deploying Jaeger with SPM Enabled

Deploy an OpenTelemetry Collector for Jaeger with the spanmetrics connector:

```yaml
# jaeger-spm-deployment.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  collector.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 10s
        send_batch_size: 1000

    connectors:
      spanmetrics:
        # Generate metrics from spans
        histogram:
          explicit:
            buckets: [2ms, 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]
        dimensions:
          - name: http.method
            default: GET
          - name: http.status_code
          - name: k8s.deployment.name
          - name: k8s.namespace.name
        aggregation_temporality: AGGREGATION_TEMPORALITY_CUMULATIVE

    exporters:
      otlp/jaeger:
        endpoint: jaeger:4317
        tls:
          insecure: true

      prometheus:
        endpoint: "0.0.0.0:8889"
        namespace: jaeger_spm
        const_labels:
          cluster: production

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlp/jaeger, spanmetrics]

        metrics/spanmetrics:
          receivers: [spanmetrics]
          exporters: [prometheus]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8889"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:0.92.0
        args:
          - "--config=/conf/collector.yaml"
        ports:
        - containerPort: 4317
        - containerPort: 4318
        - containerPort: 8889
        volumeMounts:
        - name: config
          mountPath: /conf
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
```

## Configuring Prometheus Scraping

Configure Prometheus to scrape SPM metrics:

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: observability
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    scrape_configs:
    - job_name: 'jaeger-spm'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - observability
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

## Creating Latency Regression Alerts

Define Prometheus alerting rules for latency regressions:

```yaml
# spm-alerts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: spm-alerts
  namespace: observability
data:
  alerts.yml: |
    groups:
    - name: service_performance
      interval: 30s
      rules:

      # Alert on P95 latency increase
      - alert: ServiceLatencyP95Regression
        expr: |
          (
            histogram_quantile(0.95,
              sum(rate(jaeger_spm_duration_milliseconds_bucket{span_kind="SPAN_KIND_SERVER"}[5m])) by (le, service_name, span_name)
            )
            -
            histogram_quantile(0.95,
              sum(rate(jaeger_spm_duration_milliseconds_bucket{span_kind="SPAN_KIND_SERVER"}[5m] offset 1h)) by (le, service_name, span_name)
            )
          ) / histogram_quantile(0.95,
            sum(rate(jaeger_spm_duration_milliseconds_bucket{span_kind="SPAN_KIND_SERVER"}[5m] offset 1h)) by (le, service_name, span_name)
          ) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Service {{ $labels.service_name }} P95 latency increased by {{ $value | humanizePercentage }}"
          description: "P95 latency for {{ $labels.service_name }}/{{ $labels.span_name }} increased significantly compared to 1 hour ago"

      # Alert on P99 latency spike
      - alert: ServiceLatencyP99Spike
        expr: |
          histogram_quantile(0.99,
            sum(rate(jaeger_spm_duration_milliseconds_bucket{span_kind="SPAN_KIND_SERVER"}[5m])) by (le, service_name, span_name)
          ) > 5000
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.service_name }} P99 latency spike"
          description: "P99 latency for {{ $labels.service_name }}/{{ $labels.span_name }} is {{ $value }}ms"

      # Alert on error rate increase
      - alert: ServiceErrorRateIncreased
        expr: |
          (
            sum(rate(jaeger_spm_calls_total{status_code="STATUS_CODE_ERROR"}[5m])) by (service_name, span_name)
            /
            sum(rate(jaeger_spm_calls_total[5m])) by (service_name, span_name)
          ) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.service_name }} error rate above 5%"
          description: "Error rate for {{ $labels.service_name }}/{{ $labels.span_name }} is {{ $value | humanizePercentage }}"

      # Alert on slow operation
      - alert: SlowOperationDetected
        expr: |
          histogram_quantile(0.50,
            sum(rate(jaeger_spm_duration_milliseconds_bucket[5m])) by (le, service_name, span_name)
          ) > 1000
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Slow operation detected: {{ $labels.service_name }}/{{ $labels.span_name }}"
          description: "Median latency is {{ $value }}ms for the last 15 minutes"

      # Alert on throughput drop
      - alert: ServiceThroughputDrop
        expr: |
          (
            sum(rate(jaeger_spm_calls_total[5m])) by (service_name, span_name)
            -
            sum(rate(jaeger_spm_calls_total[5m] offset 10m)) by (service_name, span_name)
          ) / sum(rate(jaeger_spm_calls_total[5m] offset 10m)) by (service_name, span_name) < -0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Service {{ $labels.service_name }} throughput dropped by {{ $value | humanizePercentage }}"
          description: "Request rate for {{ $labels.service_name }} dropped significantly"
```

## Building Performance Dashboards

Create Grafana dashboards for service performance monitoring:

```json
{
  "dashboard": {
    "title": "Service Performance Monitoring (SPM)",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "sum(rate(jaeger_spm_calls_total{service_name=\"$service\"}[5m])) by (span_name)",
            "legendFormat": "{{span_name}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "sum(rate(jaeger_spm_calls_total{service_name=\"$service\", status_code=\"STATUS_CODE_ERROR\"}[5m])) by (span_name) / sum(rate(jaeger_spm_calls_total{service_name=\"$service\"}[5m])) by (span_name)",
            "legendFormat": "{{span_name}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Latency Percentiles",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(jaeger_spm_duration_milliseconds_bucket{service_name=\"$service\"}[5m])) by (le, span_name))",
            "legendFormat": "P50 - {{span_name}}"
          },
          {
            "expr": "histogram_quantile(0.95, sum(rate(jaeger_spm_duration_milliseconds_bucket{service_name=\"$service\"}[5m])) by (le, span_name))",
            "legendFormat": "P95 - {{span_name}}"
          },
          {
            "expr": "histogram_quantile(0.99, sum(rate(jaeger_spm_duration_milliseconds_bucket{service_name=\"$service\"}[5m])) by (le, span_name))",
            "legendFormat": "P99 - {{span_name}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Latency Heatmap",
        "targets": [
          {
            "expr": "sum(increase(jaeger_spm_duration_milliseconds_bucket{service_name=\"$service\"}[1m])) by (le)",
            "format": "heatmap"
          }
        ],
        "type": "heatmap"
      }
    ],
    "templating": {
      "list": [
        {
          "name": "service",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(jaeger_spm_calls_total, service_name)"
        }
      ]
    }
  }
}
```

## Implementing Automated Regression Detection

Create a script to detect latency regressions during deployments:

```python
# detect_regression.py
import requests
import sys
import os

def query_prometheus(url, query):
    """Query Prometheus and return results"""
    response = requests.get(f'{url}/api/v1/query', params={'query': query})
    return response.json()['data']['result']

def detect_latency_regression(prom_url, service_name, threshold_percent=20):
    """
    Compare current P95 latency to baseline from 1 hour ago
    Returns True if regression detected
    """

    # Query current P95 latency
    current_query = f'''
    histogram_quantile(0.95,
      sum(rate(jaeger_spm_duration_milliseconds_bucket{{service_name="{service_name}", span_kind="SPAN_KIND_SERVER"}}[5m])) by (le, service_name, span_name)
    )
    '''

    # Query baseline P95 latency from 1 hour ago
    baseline_query = f'''
    histogram_quantile(0.95,
      sum(rate(jaeger_spm_duration_milliseconds_bucket{{service_name="{service_name}", span_kind="SPAN_KIND_SERVER"}}[5m] offset 1h)) by (le, service_name, span_name)
    )
    '''

    current = query_prometheus(prom_url, current_query)
    baseline = query_prometheus(prom_url, baseline_query)

    if not current or not baseline:
        print(f"Insufficient data for {service_name}")
        return False

    for curr_metric in current:
        span_name = curr_metric['metric'].get('span_name', '')
        curr_latency = float(curr_metric['value'][1])

        # Find matching baseline
        baseline_metric = next(
            (b for b in baseline if b['metric'].get('span_name') == span_name),
            None
        )

        if not baseline_metric:
            continue

        baseline_latency = float(baseline_metric['value'][1])

        if baseline_latency > 0:
            increase_percent = ((curr_latency - baseline_latency) / baseline_latency) * 100

            if increase_percent > threshold_percent:
                print(f"REGRESSION DETECTED: {service_name}/{span_name}")
                print(f"  Current P95: {curr_latency:.2f}ms")
                print(f"  Baseline P95: {baseline_latency:.2f}ms")
                print(f"  Increase: {increase_percent:.1f}%")
                return True

    return False

if __name__ == '__main__':
    prom_url = os.environ.get('PROMETHEUS_URL', 'http://localhost:9090')
    service = sys.argv[1] if len(sys.argv) > 1 else 'payment-service'

    if detect_latency_regression(prom_url, service):
        sys.exit(1)  # Fail deployment
    else:
        print(f"No latency regression detected for {service}")
        sys.exit(0)
```

## Integrating with CI/CD

Add regression detection to deployment pipeline:

```yaml
# .github/workflows/deploy.yaml
name: Deploy with Performance Validation
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v5

    - name: Deploy to Kubernetes
      run: |
        kubectl apply -f k8s/payment-service.yaml
        kubectl rollout status deployment/payment-service -n production

    - name: Wait for metrics
      run: sleep 300  # Wait 5 minutes for metrics

    - name: Check for latency regression
      run: |
        kubectl port-forward -n observability svc/prometheus 9090:9090 &
        sleep 5
        PROMETHEUS_URL=http://127.0.0.1:9090 python scripts/detect_regression.py payment-service

    - name: Rollback on regression
      if: failure()
      run: |
        kubectl rollout undo deployment/payment-service -n production
        echo "Deployment rolled back due to latency regression"
```

Jaeger Service Performance Monitoring transforms trace data into actionable performance metrics. By automatically detecting latency regressions through SPM, you catch performance issues before they impact users, ensuring deployments maintain service quality in Kubernetes environments.
