# How to Use Victoria Metrics Anomaly Detection for Kubernetes Workload Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Monitoring, VictoriaMetrics

Description: Discover how to leverage VictoriaMetrics anomaly detection capabilities to automatically identify unusual patterns in Kubernetes workload metrics and reduce alert noise from static thresholds.

---

Static threshold alerts create a constant tension in Kubernetes monitoring. Set thresholds too low and you drown in false positives. Set them too high and you miss real issues. VictoriaMetrics anomaly detection solves this by learning normal behavior patterns and alerting only when metrics deviate significantly from historical norms.

This guide walks through implementing VictoriaMetrics anomaly detection for Kubernetes workloads, from basic setup to advanced forecasting and seasonal pattern recognition.

## Understanding VictoriaMetrics Anomaly Detection

VictoriaMetrics provides built-in MetricsQL functions for anomaly detection that go beyond simple threshold alerts:

- `mad_over_time()` - Median Absolute Deviation for outlier detection
- `outlier_iqr()` - Interquartile Range based outlier detection
- `predict_linear()` - Linear regression forecasting
- `holt_winters()` - Exponential smoothing for seasonal patterns
- `range_normalize()` - Normalize metrics to detect relative changes

These functions enable sophisticated anomaly detection without external machine learning systems.

## Deploying VictoriaMetrics in Kubernetes

First, deploy VictoriaMetrics with sufficient retention for historical analysis:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: victoria-metrics
  namespace: monitoring
spec:
  serviceName: victoria-metrics
  replicas: 1
  selector:
    matchLabels:
      app: victoria-metrics
  template:
    metadata:
      labels:
        app: victoria-metrics
    spec:
      containers:
      - name: victoria-metrics
        image: victoriametrics/victoria-metrics:v1.95.1
        args:
        - -storageDataPath=/victoria-metrics-data
        - -retentionPeriod=90d  # 90 days for pattern learning
        - -search.maxQueryDuration=30m  # Allow longer queries for analysis
        - -search.maxSeries=1000000
        - -memory.allowedPercent=80
        ports:
        - containerPort: 8428
          name: http
        volumeMounts:
        - name: storage
          mountPath: /victoria-metrics-data
        resources:
          requests:
            memory: "4Gi"
            cpu: "1000m"
          limits:
            memory: "8Gi"
            cpu: "2000m"
  volumeClaimTemplates:
  - metadata:
      name: storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
---
apiVersion: v1
kind: Service
metadata:
  name: victoria-metrics
  namespace: monitoring
spec:
  selector:
    app: victoria-metrics
  ports:
  - port: 8428
    targetPort: 8428
    name: http
```

The extended retention period is essential for learning seasonal patterns and baseline behavior.

## Basic Anomaly Detection with MAD

Median Absolute Deviation (MAD) detects outliers by measuring how far values deviate from the median:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: victoria-metrics-anomaly-alerts
  namespace: monitoring
spec:
  groups:
  - name: anomaly_detection
    interval: 1m
    rules:
    # Detect CPU usage anomalies
    - alert: CPUUsageAnomaly
      expr: |
        abs(
          rate(container_cpu_usage_seconds_total[5m])
          -
          median_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m])
        )
        >
        3 * mad_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m])
      for: 10m
      labels:
        severity: warning
        type: anomaly
      annotations:
        summary: "CPU usage anomaly detected for {{$labels.pod}}"
        description: "Pod {{$labels.pod}} CPU usage deviates {{ $value | humanize }} from normal pattern"
```

This alert fires when CPU usage deviates more than 3 MAD from the median, a statistically significant outlier.

## Detecting Memory Anomalies with IQR

Interquartile Range (IQR) method is robust against extreme outliers:

```promql
# Memory usage anomaly detection
(
  container_memory_working_set_bytes
  >
  quantile_over_time(0.75, container_memory_working_set_bytes[1h]) +
  1.5 * (
    quantile_over_time(0.75, container_memory_working_set_bytes[1h]) -
    quantile_over_time(0.25, container_memory_working_set_bytes[1h])
  )
)
or
(
  container_memory_working_set_bytes
  <
  quantile_over_time(0.25, container_memory_working_set_bytes[1h]) -
  1.5 * (
    quantile_over_time(0.75, container_memory_working_set_bytes[1h]) -
    quantile_over_time(0.25, container_memory_working_set_bytes[1h])
  )
)
```

This query identifies memory usage outside the IQR bounds, catching both high and low anomalies.

## Forecasting Disk Usage with Linear Prediction

Predict when disk space will run out using linear regression:

```yaml
- alert: DiskSpaceExhaustedSoon
  expr: |
    predict_linear(
      node_filesystem_avail_bytes{mountpoint="/"}[6h],
      4 * 3600  # Predict 4 hours ahead
    ) < 0
  for: 30m
  labels:
    severity: critical
    type: forecast
  annotations:
    summary: "Disk space will be exhausted on {{$labels.instance}}"
    description: "Node {{$labels.instance}} will run out of disk space in approximately 4 hours based on current usage trend"
```

This alert provides early warning before disk space exhaustion actually occurs.

## Seasonal Pattern Detection with Holt-Winters

For metrics with daily or weekly patterns, use Holt-Winters forecasting:

```promql
# Detect deviations from seasonal patterns for request rates
abs(
  rate(http_requests_total[5m])
  -
  holt_winters(rate(http_requests_total[5m])[7d:5m], 0.3, 0.1)
)
>
3 * stddev_over_time(rate(http_requests_total[5m])[7d:5m])
```

Holt-Winters learns daily and weekly patterns, making it perfect for traffic that varies predictably throughout the week.

## Multi-Dimensional Anomaly Detection

Detect anomalies across multiple related metrics simultaneously:

```promql
# Detect pod health anomalies considering multiple signals
(
  # CPU anomaly
  (
    abs(rate(container_cpu_usage_seconds_total[5m]) -
        median_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m]))
    > 2 * mad_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m])
  )
  and
  # Memory anomaly
  (
    abs(container_memory_working_set_bytes -
        median_over_time(container_memory_working_set_bytes[1h]))
    > 2 * mad_over_time(container_memory_working_set_bytes[1h])
  )
  and
  # Network anomaly
  (
    abs(rate(container_network_receive_bytes_total[5m]) -
        median_over_time(rate(container_network_receive_bytes_total[5m])[1h:5m]))
    > 2 * mad_over_time(rate(container_network_receive_bytes_total[5m])[1h:5m])
  )
)
```

This composite query only alerts when multiple metrics simultaneously show anomalous behavior, reducing false positives.

## Normalized Anomaly Detection

Use range normalization to detect relative changes regardless of absolute values:

```promql
# Detect unusual relative changes in request latency
abs(
  range_normalize(
    0, 1,
    histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
  )
  -
  range_normalize(
    0, 1,
    median_over_time(
      histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))[1h:5m]
    )
  )
) > 0.3
```

Normalization makes the query work across services with different latency baselines.

## Time-of-Day Aware Anomaly Detection

Account for expected variations throughout the day:

```yaml
- alert: UnexpectedTrafficForTimeOfDay
  expr: |
    rate(http_requests_total[5m])
    >
    1.5 * (
      # Average for this hour over past 7 days
      avg_over_time(
        rate(http_requests_total[5m])[7d:5m] offset 0h
      )
    )
  for: 15m
  annotations:
    summary: "Unusual traffic volume for current time"
    description: "Traffic is {{ $value | humanizePercentage }} above normal for this time of day"
```

## Creating Anomaly Severity Scores

Calculate anomaly severity scores for prioritization:

```promql
# Anomaly severity score (0-1 scale)
clamp_max(
  abs(
    rate(container_cpu_usage_seconds_total[5m]) -
    median_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m])
  )
  /
  (3 * mad_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m]) + 0.001),
  1
)
```

This score indicates how many MADs away from normal the metric is, capped at 1.0 for severe anomalies.

## Visualizing Anomalies in Grafana

Create Grafana panels that highlight anomalies:

```json
{
  "targets": [
    {
      "expr": "rate(container_cpu_usage_seconds_total[5m])",
      "legendFormat": "Actual CPU"
    },
    {
      "expr": "median_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m])",
      "legendFormat": "Expected (Median)"
    },
    {
      "expr": "median_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m]) + 3 * mad_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m])",
      "legendFormat": "Upper Bound (3 MAD)"
    },
    {
      "expr": "median_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m]) - 3 * mad_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m])",
      "legendFormat": "Lower Bound (3 MAD)"
    }
  ]
}
```

This visualization shows actual values, expected values, and anomaly thresholds on the same graph.

## Automatic Threshold Adjustment

Implement dynamic thresholds that adjust based on recent patterns:

```promql
# Dynamic threshold based on recent variance
avg_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m])
+
(
  # Use larger multiplier during high variance periods
  (
    stddev_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m])
    /
    avg_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m])
  ) * 3
)
```

## Performance Optimization for Anomaly Queries

Anomaly detection queries can be expensive. Optimize with recording rules:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: anomaly-recording-rules
  namespace: monitoring
spec:
  groups:
  - name: anomaly_precompute
    interval: 1m
    rules:
    # Pre-compute median values
    - record: container_cpu_usage:median_1h
      expr: |
        median_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m])

    # Pre-compute MAD values
    - record: container_cpu_usage:mad_1h
      expr: |
        mad_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m])

    # Pre-compute anomaly scores
    - record: container_cpu_usage:anomaly_score
      expr: |
        abs(
          rate(container_cpu_usage_seconds_total[5m]) -
          container_cpu_usage:median_1h
        )
        /
        (3 * container_cpu_usage:mad_1h + 0.001)
```

Recording rules pre-compute expensive calculations, making alerts evaluate faster.

## Handling Sparse Metrics

For metrics with gaps, use interpolation:

```promql
# Detect anomalies in sparse metrics
abs(
  avg_over_time(metric_name[5m])
  -
  median_over_time(
    avg_over_time(metric_name[5m])[1h:5m]
  )
)
>
3 * mad_over_time(avg_over_time(metric_name[5m])[1h:5m])
```

The nested aggregation smooths out gaps before anomaly detection.

## Conclusion

VictoriaMetrics anomaly detection transforms Kubernetes monitoring from reactive threshold alerts to proactive pattern recognition. By learning normal behavior patterns, you catch unusual situations that static thresholds would miss while avoiding false alarms from expected variations.

Start with simple MAD-based detection for CPU and memory, then expand to forecasting for capacity planning and Holt-Winters for seasonal patterns. Use recording rules to optimize query performance, and combine multiple signals for robust anomaly detection. This approach dramatically improves signal-to-noise ratio in your alerting, letting you focus on actual issues rather than tuning thresholds.
